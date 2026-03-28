import { Injectable, Logger } from '@nestjs/common'
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto'
import { PrismaService } from '../../prisma/prisma.service'
import { MessagesService } from '../messages/messages.service'
import { MessageProducer } from '../queues/message.producer'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private messageProducer: MessageProducer,
  ) {}

  async handleMessage(dto: EvolutionWebhookDto): Promise<void> {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { instanceName: dto.instance },
      include: { tenant: true },
    })
    if (!instance) {
      this.logger.warn(`Instância WhatsApp não encontrada: ${dto.instance}`)
      return
    }

    const tenantId = instance.tenantId
    const chatId = dto.data.key.remoteJid
    const phone = chatId.split('@')[0] ?? chatId
    const body =
      dto.data.message?.conversation ??
      dto.data.message?.extendedTextMessage?.text ??
      ''
    if (!body.trim()) return

    const tsRaw = dto.data.messageTimestamp
    const tsNum = typeof tsRaw === 'string' ? parseInt(tsRaw, 10) : tsRaw
    const timestamp = new Date(
      String(tsNum).length > 12 ? tsNum : tsNum * 1000,
    )

    const lead = await this.prisma.lead.upsert({
      where: { tenantId_chatId: { tenantId, chatId } },
      create: {
        tenantId,
        chatId,
        phone,
        name: dto.data.pushName ?? null,
        lastMessageAt: timestamp,
      },
      update: {
        lastMessageAt: timestamp,
        ...(dto.data.pushName ? { name: dto.data.pushName } : {}),
      },
    })

    const messageId = `${dto.instance}:${dto.data.key.id}`
    const result = await this.messagesService.createOrSkip({
      tenantId,
      leadId: lead.id,
      messageId,
      chatId,
      fromMe: dto.data.key.fromMe,
      body,
      timestamp,
    })

    if (result.created) {
      await this.messageProducer.scheduleProcessing(chatId, tenantId)
    }
  }
}
