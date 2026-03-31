import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiAnalyzeResult } from '../ai/dto/ai-response.dto';
import {
  calculatePriorityScore,
  evaluateFunnelTransition,
} from './funnel.rules';
import { Lead, LeadStatus, Source } from '@prisma/client';
import { DashboardGateway } from '../dashboard/dashboard.gateway';
import { parseAiSettingsJson } from '../tenants/tenant-ai.runtime';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    // @Optional() evita dependência circular no bootstrap antes do Gateway inicializar
    @Optional() private readonly dashboardGateway?: DashboardGateway,
  ) {}

  async applyAiResult(
    tenantId: string,
    leadId: string,
    aiResult: AiAnalyzeResult,
    messageIds: string[],
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        tenant: {
          select: {
            requiredFields: true,
            aiPrompt: true,
            promptVersion: true,
            aiSettings: true,
          },
        },
      },
    });

    if (!lead) {
      this.logger.error(`Lead não encontrado: ${leadId}`);
      return;
    }

    // ─── Salva AiAnalysis ─────────────────────────────────────────────────
    await this.prisma.aiAnalysis.create({
      data: {
        tenantId,
        leadId,
        messageIds,
        promptSent: aiResult.promptSent,
        rawResponse: aiResult.rawResponse,
        parsedResult: JSON.parse(JSON.stringify(aiResult)),
        intent: aiResult.intent,
        sentiment: aiResult.sentiment,
        confidenceScore: aiResult.confidenceScore,
        extractedFields: JSON.parse(JSON.stringify(aiResult.extractedFields)),
        promptVersion: aiResult.promptVersion,
        cacheHit: aiResult.cacheHit,
        tokensUsed: aiResult.tokensUsed,
        latencyMs: aiResult.latencyMs,
      },
    });

    // ─── Avalia transição de funil ────────────────────────────────────────
    const extractedFieldsRecord: Record<string, string | null> = {
      name: aiResult.extractedFields.name,
      plate: aiResult.extractedFields.plate,
      email: aiResult.extractedFields.email,
    };

    const rt = parseAiSettingsJson(lead.tenant.aiSettings, {
      provider: this.configService.get<string>('ai.provider') ?? 'openai',
      apiKey: this.configService.get<string>('ai.apiKey') ?? '',
      model: this.configService.get<string>('ai.model') ?? 'gpt-4o-mini',
      baseUrl:
        this.configService.get<string>('ai.baseUrl') ??
        'https://api.openai.com/v1',
      timeoutMs: this.configService.get<number>('ai.timeoutMs') ?? 30_000,
      maxTokens: this.configService.get<number>('ai.maxTokens') ?? 1000,
      confidenceThreshold:
        this.configService.get<number>('ai.confidenceThreshold') ?? 0.6,
    });

    const transition = evaluateFunnelTransition({
      currentStatus: lead.status,
      intent: aiResult.intent,
      disqualifyReason: aiResult.disqualifyReason,
      confidenceScore: aiResult.confidenceScore,
      requiredFields: lead.tenant.requiredFields,
      extractedFields: extractedFieldsRecord,
      confidenceThreshold: rt.confidenceThreshold,
    });

    // ─── Calcula priority score ───────────────────────────────────────────
    const priorityScore = calculatePriorityScore({
      lastMessageAt: lead.lastMessageAt,
      status: transition.newStatus,
      extractedFields: extractedFieldsRecord,
      requiredFields: lead.tenant.requiredFields,
      sentiment: aiResult.sentiment,
    });

    // ─── Prepara campos a atualizar (respeitando humanOverride) ──────────
    const humanOverrides = new Set(lead.humanOverrideFields);

    const updateData: Partial<Lead> & Record<string, unknown> = {
      status: transition.newStatus,
      intent: aiResult.intent,
      sentiment: aiResult.sentiment,
      confidenceScore: aiResult.confidenceScore,
      priorityScore,
      needsHumanReview: aiResult.needsHumanReview,
      summary: aiResult.summary,
      missingFields: aiResult.missingFields,
      disqualifyReason: aiResult.disqualifyReason,
    };

    // Campos extraídos: nunca sobrescrever se tiver humanOverride
    const fieldsToCheck = ['name', 'plate', 'email'] as const;
    for (const field of fieldsToCheck) {
      if (!humanOverrides.has(field) && aiResult.extractedFields[field] !== null) {
        updateData[field] = aiResult.extractedFields[field];
      }
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    // ─── Registra FunnelEvent se houve transição de status ────────────────
    if (transition.newStatus !== lead.status) {
      await this.prisma.funnelEvent.create({
        data: {
          tenantId,
          leadId,
          fromStatus: lead.status,
          toStatus: transition.newStatus,
          reason: transition.reason,
          triggeredBy: 'AI',
          metadata: { jobId: messageIds[0], promptVersion: aiResult.promptVersion },
        },
      });

      // AuditLog para a transição
      await this.auditService.log({
        tenantId,
        leadId,
        field: 'status',
        oldValue: lead.status,
        newValue: transition.newStatus,
        source: Source.AI,
        metadata: { reason: transition.reason },
      });

      this.logger.log(
        `Funil: lead=${leadId} ${lead.status} → ${transition.newStatus} (${transition.reason})`,
      );
    }

    // AuditLog para campos extraídos que mudaram
    const auditEntries = [];
    for (const field of fieldsToCheck) {
      if (!humanOverrides.has(field) && aiResult.extractedFields[field] !== null) {
        const oldValue = lead[field] ?? undefined;
        const newValue = aiResult.extractedFields[field] ?? undefined;
        if (oldValue !== newValue) {
          auditEntries.push({
            tenantId,
            leadId,
            field,
            oldValue: oldValue ? String(oldValue) : undefined,
            newValue: newValue ? String(newValue) : undefined,
            source: Source.AI,
            metadata: { promptVersion: aiResult.promptVersion },
          });
        }
      }
    }

    if (auditEntries.length > 0) {
      await this.auditService.logMany(auditEntries);
    }

    // Emite evento Socket.io para clientes conectados no tenant
    if (this.dashboardGateway) {
      const { chatId: _chatId, ...safeLeadData } = updatedLead;
      this.dashboardGateway.emitLeadUpdated(tenantId, safeLeadData as unknown as Record<string, unknown>);
    }

    this.logger.log(
      `Pipeline concluído: lead=${leadId} status=${updatedLead.status} priority=${priorityScore.toFixed(2)}`,
    );
  }

  async manualStatusChange(
    tenantId: string,
    leadId: string,
    newStatus: LeadStatus,
    userId: string,
    reason?: string,
  ): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      throw new Error(`Lead não encontrado: ${leadId}`);
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: newStatus },
    });

    await this.prisma.funnelEvent.create({
      data: {
        tenantId,
        leadId,
        fromStatus: lead.status,
        toStatus: newStatus,
        reason: reason ?? 'Alteração manual',
        triggeredBy: 'HUMAN',
        metadata: { userId },
      },
    });

    await this.auditService.log({
      tenantId,
      leadId,
      userId,
      field: 'status',
      oldValue: lead.status,
      newValue: newStatus,
      source: Source.HUMAN,
    });

    return updatedLead;
  }
}
