import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { MessageProducer } from '../queues/message.producer';
import { UpdateLeadDto, LeadFiltersDto } from './dto/lead.dto';
import {
  GetMessagesDto,
  PaginatedMessagesResponseDto,
} from './dto/get-messages.dto';
import { Lead, LeadStatus, Source } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pipelineService: PipelineService,
    private readonly messageProducer: MessageProducer,
  ) {}

  async findAll(filters: LeadFiltersDto) {
    const where = {
      ...(filters.status && { status: filters.status as LeadStatus }),
      ...(filters.needsHumanReview !== undefined && {
        needsHumanReview: filters.needsHumanReview,
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { phone: { contains: filters.search } },
          { plate: { contains: filters.search, mode: 'insensitive' as const } },
          { email: { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const orderBy =
      filters.orderBy === 'lastMessageAt'
        ? ([
            { lastMessageAt: 'desc' as const },
            { priorityScore: 'desc' as const },
          ] as const)
        : ([
            { priorityScore: 'desc' as const },
            { lastMessageAt: 'desc' as const },
          ] as const);

    const items = await this.prisma.lead.findMany({
      where: {
        ...where,
        ...(filters.cursor && {
          createdAt: { lt: new Date(filters.cursor) },
        }),
      },
      orderBy: [...orderBy],
      take: filters.limit + 1,
      select: {
        id: true,
        phone: true,
        name: true,
        plate: true,
        email: true,
        status: true,
        intent: true,
        sentiment: true,
        confidenceScore: true,
        priorityScore: true,
        needsHumanReview: true,
        summary: true,
        missingFields: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasNextPage = items.length > filters.limit;
    const data = hasNextPage ? items.slice(0, -1) : items;
    const nextCursor = hasNextPage
      ? data[data.length - 1]?.createdAt.toISOString()
      : null;

    return {
      data,
      pagination: {
        limit: filters.limit,
        hasNextPage,
        nextCursor,
        total: await this.prisma.lead.count({ where }),
      },
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 50,
          select: {
            id: true,
            fromMe: true,
            body: true,
            timestamp: true,
            processed: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const { chatId: _chatId, ...safeLead } = lead;
    return safeLead;
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    userId: string,
  ): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const humanOverrideFields = new Set(lead.humanOverrideFields);
    const auditEntries = [];
    const updateData: Record<string, unknown> = {};

    const editableFields = ['name', 'plate', 'email'] as const;
    for (const field of editableFields) {
      const newValue = dto[field];
      if (newValue !== undefined && newValue !== lead[field]) {
        updateData[field] = newValue;
        humanOverrideFields.add(field);
        auditEntries.push({
          leadId: id,
          userId,
          field,
          oldValue: lead[field] ?? undefined,
          newValue,
          source: Source.HUMAN,
        });
      }
    }

    if (dto.status && dto.status !== lead.status) {
      return this.pipelineService.manualStatusChange(
        id,
        dto.status as LeadStatus,
        userId,
        dto.disqualifyReason,
      );
    }

    if (dto.disqualifyReason && dto.disqualifyReason !== lead.disqualifyReason) {
      updateData.disqualifyReason = dto.disqualifyReason;
    }

    if (Object.keys(updateData).length === 0 && auditEntries.length === 0) {
      return lead;
    }

    updateData.humanOverrideFields = Array.from(humanOverrideFields);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: updateData,
    });

    if (auditEntries.length > 0) {
      await this.auditService.logMany(auditEntries);
    }

    return updated;
  }

  async reprocess(id: string): Promise<{ queued: boolean }> {
    const lead = await this.prisma.lead.findFirst({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    await this.prisma.lead.update({
      where: { id },
      data: { needsHumanReview: false },
    });

    await this.prisma.message.updateMany({
      where: { leadId: id },
      data: { processed: false },
    });

    await this.messageProducer.scheduleProcessing(lead.chatId, lead.id);

    return { queued: true };
  }

  async getMessages(
    leadId: string,
    query: GetMessagesDto,
  ): Promise<PaginatedMessagesResponseDto> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId },
      select: { id: true },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const limit = query.limit ?? 50;

    let beforeTimestamp: Date | undefined;
    if (query.cursor) {
      const cur = await this.prisma.message.findFirst({
        where: { id: query.cursor, leadId },
        select: { timestamp: true },
      });
      if (!cur) {
        throw new BadRequestException('Cursor de mensagem inválido');
      }
      beforeTimestamp = cur.timestamp;
    }

    const where = {
      leadId,
      ...(beforeTimestamp && { timestamp: { lt: beforeTimestamp } }),
    };

    const [batch, total, latestAnalysis] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          body: true,
          fromMe: true,
          timestamp: true,
          processed: true,
        },
      }),
      this.prisma.message.count({ where: { leadId } }),
      this.prisma.aiAnalysis.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          intent: true,
          sentiment: true,
          confidenceScore: true,
          extractedFields: true,
          promptVersion: true,
          createdAt: true,
          parsedResult: true,
        },
      }),
    ]);

    const hasMore = batch.length > limit;
    const slice = hasMore ? batch.slice(0, limit) : batch;
    const chronological = [...slice].reverse();

    const nextCursor =
      hasMore && chronological.length > 0 ? chronological[0].id : null;

    const parsed = latestAnalysis?.parsedResult as
      | Record<string, unknown>
      | null
      | undefined;

    const ex = latestAnalysis?.extractedFields as
      | Record<string, unknown>
      | null
      | undefined;

    return {
      data: chronological.map((m) => ({
        id: m.id,
        body: m.body,
        fromMe: m.fromMe,
        timestamp: m.timestamp.toISOString(),
        processed: m.processed,
      })),
      nextCursor,
      total,
      latestAnalysis: latestAnalysis
        ? {
            id: latestAnalysis.id,
            intent: latestAnalysis.intent as
              | 'NEGOCIACAO'
              | 'SUPORTE'
              | 'SOCIAL',
            sentiment: latestAnalysis.sentiment as
              | 'POSITIVO'
              | 'NEUTRO'
              | 'NEGATIVO',
            confidenceScore: latestAnalysis.confidenceScore,
            extractedFields: {
              name: (ex?.name as string | null | undefined) ?? null,
              plate: (ex?.plate as string | null | undefined) ?? null,
              email: (ex?.email as string | null | undefined) ?? null,
            },
            summary: (parsed?.summary as string) ?? '',
            missingFields: Array.isArray(parsed?.missingFields)
              ? (parsed.missingFields as string[])
              : [],
            promptVersion: latestAnalysis.promptVersion,
            createdAt: latestAnalysis.createdAt.toISOString(),
          }
        : null,
    };
  }

  async getHistory(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    const [auditLogs, funnelEvents, aiAnalyses] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.funnelEvent.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.aiAnalysis.findMany({
        where: { leadId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          intent: true,
          sentiment: true,
          confidenceScore: true,
          extractedFields: true,
          promptVersion: true,
          cacheHit: true,
          tokensUsed: true,
          latencyMs: true,
          createdAt: true,
        },
      }),
    ]);

    return { auditLogs, funnelEvents, aiAnalyses };
  }
}
