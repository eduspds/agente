import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { PrismaService } from '../../prisma/prisma.service'
import { MessagesService } from '../messages/messages.service'
import { AiService } from '../ai/ai.service'
import { PipelineService } from '../pipeline/pipeline.service'
import { DashboardGateway } from '../dashboard/dashboard.gateway'
import { JOB_PROCESS_MESSAGES, QUEUE_MESSAGE_PROCESSING } from './queues.constants'
import { Prisma } from '@prisma/client'

export interface ProcessMessagesJob {
  chatId: string
  tenantId: string
}

@Processor(QUEUE_MESSAGE_PROCESSING)
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name)

  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService,
    private aiService: AiService,
    private pipelineService: PipelineService,
    private dashboardGateway: DashboardGateway,
  ) {
    super()
  }

  async process(job: Job<ProcessMessagesJob, unknown, string>): Promise<void> {
    if (job.name !== JOB_PROCESS_MESSAGES) return

    const { chatId, tenantId } = job.data

    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, chatId },
    })
    if (!lead) {
      this.logger.warn(`Lead não encontrado para chat ${chatId}`)
      return
    }

    const messages = await this.messagesService.findUnprocessedForChat(tenantId, chatId)
    if (messages.length === 0) return

    const lines = messages.map((m) => `${m.fromMe ? 'Agente' : 'Lead'}: ${m.body}`)
    const aiResult = await this.aiService.analyzeForTenant(tenantId, lines, lead.phone)

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { promptVersion: true },
    })

    const messageIds = messages.map((m) => m.id)
    const promptSent = `[tenant ${tenantId} chat ${chatId}]`

    await this.prisma.aiAnalysis.create({
      data: {
        tenantId,
        leadId: lead.id,
        messageIds,
        promptSent,
        rawResponse: JSON.stringify(aiResult),
        parsedResult: aiResult as unknown as Prisma.InputJsonValue,
        intent: aiResult.intent,
        sentiment: aiResult.sentiment,
        confidenceScore: aiResult.confidenceScore,
        extractedFields: aiResult.extractedFields as unknown as Prisma.InputJsonValue,
        mentionedCompany: aiResult.mentionedCompany,
        mentionedLicense: aiResult.mentionedLicense,
        promptVersion: tenant?.promptVersion ?? 1,
      },
    })

    const updated = await this.pipelineService.process(lead, aiResult, tenantId)
    await this.messagesService.markProcessed(
      messages.map((m) => m.id),
      tenantId,
    )

    this.dashboardGateway.emitLeadUpdated(tenantId, {
      leadId: updated.id,
      status: updated.status,
      chatId: updated.chatId,
    })
  }
}
