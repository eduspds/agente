import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface CreateMessageInput {
  tenantId: string
  leadId: string
  messageId: string
  chatId: string
  fromMe: boolean
  body: string
  timestamp: Date
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name)

  constructor(private prisma: PrismaService) {}

  async createOrSkip(input: CreateMessageInput): Promise<{ created: boolean; id: string }> {
    const existing = await this.prisma.message.findUnique({
      where: { messageId: input.messageId },
    })
    if (existing) {
      if (existing.tenantId !== input.tenantId) {
        this.logger.warn(`messageId duplicado em outro tenant: ${input.messageId}`)
      }
      return { created: false, id: existing.id }
    }

    const msg = await this.prisma.message.create({
      data: {
        tenantId: input.tenantId,
        leadId: input.leadId,
        messageId: input.messageId,
        chatId: input.chatId,
        fromMe: input.fromMe,
        body: input.body,
        timestamp: input.timestamp,
        processed: false,
      },
    })
    return { created: true, id: msg.id }
  }

  async findUnprocessedForChat(tenantId: string, chatId: string) {
    return this.prisma.message.findMany({
      where: { tenantId, chatId, processed: false },
      orderBy: { timestamp: 'asc' },
    })
  }

  async markProcessed(ids: string[], tenantId: string): Promise<void> {
    if (ids.length === 0) return
    await this.prisma.message.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { processed: true },
    })
  }

  async resetProcessedForLead(leadId: string, tenantId: string): Promise<void> {
    await this.prisma.message.updateMany({
      where: { leadId, tenantId },
      data: { processed: false },
    })
  }
}
