import { Injectable, Logger } from '@nestjs/common'
import { Lead, LeadStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AiResponse } from '../ai/dto/ai-response.dto'

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name)

  constructor(private prisma: PrismaService) {}

  async process(lead: Lead, aiResult: AiResponse, tenantId: string): Promise<Lead> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { requiredFields: true, aiConfidThreshold: true },
    })
    const requiredFields = tenant?.requiredFields ?? ['name', 'plate', 'email']
    const threshold = tenant?.aiConfidThreshold ?? 0.6

    const newStatus = this.resolveStatus(lead, aiResult, requiredFields, threshold)
    const priorityScore = this.calculatePriority(lead, aiResult, newStatus)

    const updated = await this.prisma.lead.update({
      where: { id: lead.id, tenantId },
      data: {
        status: newStatus,
        intent: aiResult.intent,
        sentiment: aiResult.sentiment,
        confidenceScore: aiResult.confidenceScore,
        priorityScore,
        needsHumanReview: aiResult.confidenceScore < threshold,
        name: aiResult.extractedFields.name ?? lead.name,
        plate: aiResult.extractedFields.plate ?? lead.plate,
        email: aiResult.extractedFields.email ?? lead.email,
      },
    })

    if (newStatus !== lead.status) {
      await this.prisma.funnelEvent.create({
        data: {
          tenantId,
          leadId: lead.id,
          fromStatus: lead.status,
          toStatus: newStatus,
          reason: aiResult.disqualifyReason ?? `intent=${aiResult.intent}`,
          triggeredBy: 'AI',
        },
      })
      this.logger.log(`Lead ${lead.id}: ${lead.status} → ${newStatus}`)
    }

    return updated
  }

  private resolveStatus(
    lead: Lead,
    ai: AiResponse,
    requiredFields: string[],
    threshold: number,
  ): LeadStatus {
    if (ai.intent === 'SOCIAL' || ai.intent === 'SUPORTE') {
      return LeadStatus.DESQUALIFICADO
    }

    if (ai.disqualifyReason) return LeadStatus.DESQUALIFICADO

    const fields = ai.extractedFields as Record<string, string | null>
    const allFilled = requiredFields.every((f) => !!fields[f])

    if (ai.intent === 'NEGOCIACAO' && allFilled && ai.confidenceScore >= threshold) {
      return LeadStatus.QUALIFICADO
    }

    return LeadStatus.EM_QUALIFICACAO
  }

  private calculatePriority(lead: Lead, ai: AiResponse, status: LeadStatus): number {
    const isRecent = lead.lastMessageAt
      ? Date.now() - lead.lastMessageAt.getTime() < 86400000
      : false

    const statusWeight: Record<LeadStatus, number> = {
      QUALIFICADO: 30,
      EM_QUALIFICACAO: 20,
      NOVO: 10,
      DESQUALIFICADO: 0,
      ESPECIALISTA: 30,
    }

    const hasAllFields =
      !!ai.extractedFields.name && !!ai.extractedFields.plate && !!ai.extractedFields.email

    const score =
      (isRecent ? 40 : 0) +
      (statusWeight[status] ?? 0) +
      (hasAllFields ? 20 : 0) +
      (ai.sentiment === 'POSITIVO' ? 10 : 0)

    return Math.min(score / 100, 1.0)
  }
}
