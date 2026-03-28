import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const MAX_MESSAGES = 500

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      select: {
        id: true,
        chatId: true,
        phone: true,
        name: true,
        status: true,
        lastMessageAt: true,
        needsHumanReview: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            body: true,
            fromMe: true,
            timestamp: true,
          },
        },
      },
    })
  }

  async getLeadMessages(leadId: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: {
        id: true,
        chatId: true,
        phone: true,
        name: true,
        plate: true,
        email: true,
        status: true,
        intent: true,
        sentiment: true,
        confidenceScore: true,
        needsHumanReview: true,
        lastMessageAt: true,
      },
    })
    if (!lead) throw new NotFoundException('Conversa não encontrada')

    const messages = await this.prisma.message.findMany({
      where: { tenantId, leadId },
      orderBy: { timestamp: 'asc' },
      take: MAX_MESSAGES,
      select: {
        id: true,
        messageId: true,
        fromMe: true,
        body: true,
        timestamp: true,
        processed: true,
      },
    })

    return { lead, messages }
  }
}
