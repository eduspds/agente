import { Injectable, NotFoundException } from '@nestjs/common'
import { Lead, LeadStatus, Source } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateLeadDto, ListLeadsQueryDto, PatchLeadDto } from './dto/lead.dto'
import { MessageProducer } from '../queues/message.producer'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private messageProducer: MessageProducer,
    private messagesService: MessagesService,
  ) {}

  async create(tenantId: string, dto: CreateLeadDto): Promise<Lead> {
    return this.prisma.lead.create({
      data: {
        tenantId,
        chatId: dto.chatId,
        phone: dto.phone,
        name: dto.name ?? null,
        plate: dto.plate ?? null,
        email: dto.email ?? null,
        status: dto.status ?? LeadStatus.NOVO,
      },
    })
  }

  async list(tenantId: string, query: ListLeadsQueryDto) {
    const take = query.take
    const items = await this.prisma.lead.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
      },
      take: take + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
    })

    let nextCursor: string | undefined
    if (items.length > take) {
      const last = items.pop()
      nextCursor = last?.id
    }

    return { items, nextCursor }
  }

  async findOne(id: string, tenantId: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
    })
    if (!lead) throw new NotFoundException('Lead não encontrado')
    return lead
  }

  async patch(
    id: string,
    tenantId: string,
    dto: PatchLeadDto,
    userId: string,
  ): Promise<Lead> {
    const existing = await this.findOne(id, tenantId)

    const updates: Record<string, unknown> = {}
    const audit: Array<{ field: string; oldValue: string | null; newValue: string | null }> = []

    const track = (field: keyof PatchLeadDto, oldVal: string | null | undefined, newVal: unknown) => {
      if (newVal === undefined) return
      const nv = newVal === null ? null : String(newVal)
      const ov = oldVal === null || oldVal === undefined ? null : String(oldVal)
      if (ov !== nv) {
        audit.push({ field, oldValue: ov, newValue: nv })
        updates[field] = newVal === null ? null : newVal
      }
    }

    track('name', existing.name, dto.name)
    track('plate', existing.plate, dto.plate)
    track('email', existing.email, dto.email)
    track('status', existing.status, dto.status)
    track('intent', existing.intent, dto.intent)
    track('sentiment', existing.sentiment, dto.sentiment)

    if (Object.keys(updates).length === 0) return existing

    const updated = await this.prisma.lead.update({
      where: { id, tenantId },
      data: updates as {
        name?: string | null
        plate?: string | null
        email?: string | null
        status?: LeadStatus
        intent?: string | null
        sentiment?: string | null
      },
    })

    for (const row of audit) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          leadId: id,
          userId,
          field: row.field,
          oldValue: row.oldValue,
          newValue: row.newValue,
          source: Source.HUMAN,
        },
      })
    }

    return updated
  }

  async reprocess(id: string, tenantId: string): Promise<{ ok: boolean }> {
    const lead = await this.findOne(id, tenantId)
    await this.messagesService.resetProcessedForLead(lead.id, tenantId)
    await this.messageProducer.scheduleProcessing(lead.chatId, tenantId)
    return { ok: true }
  }
}
