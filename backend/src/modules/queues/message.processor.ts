import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  JOB_PROCESS_MESSAGES,
  ProcessMessagesJobData,
  QUEUE_MESSAGE_PROCESSING,
} from './queues.constants';
import { MessagesService } from '../messages/messages.service';
import { AiService } from '../ai/ai.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(QUEUE_MESSAGE_PROCESSING)
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly aiService: AiService,
    private readonly pipelineService: PipelineService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JOB_PROCESS_MESSAGES)
  async handleProcessMessages(
    job: Job<ProcessMessagesJobData>,
  ): Promise<void> {
    const { tenantId, chatId, leadId } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.log(
      `[Job ${job.id}] Processando: tenantId=${tenantId} chatId=${chatId} tentativa=${attempt}`,
    );

    // 1. Busca mensagens não processadas em ordem cronológica
    const messages = await this.messagesService.findUnprocessedByChat(
      tenantId,
      chatId,
    );

    if (messages.length === 0) {
      this.logger.warn(
        `[Job ${job.id}] Nenhuma mensagem pendente para chatId=${chatId} — job encerrado`,
      );
      return;
    }

    // 2. Busca dados do lead para contexto
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        tenant: {
          select: {
            aiPrompt: true,
            promptVersion: true,
            requiredFields: true,
            aiSettings: true,
          },
        },
      },
    });

    if (!lead) {
      this.logger.error(
        `[Job ${job.id}] Lead não encontrado: leadId=${leadId}`,
      );
      return;
    }

    this.logger.log(
      `[Job ${job.id}] ${messages.length} mensagens para análise — lead=${leadId}`,
    );

    // 3. Chama serviço de IA
    const aiResult = await this.aiService.analyze({
      tenantId,
      lead: {
        id: lead.id,
        phone: lead.phone ?? '',
        humanOverrideFields: lead.humanOverrideFields,
      },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        timestamp: m.timestamp,
        fromMe: m.fromMe,
      })),
      tenant: {
        aiPrompt: lead.tenant.aiPrompt,
        promptVersion: lead.tenant.promptVersion,
        requiredFields: lead.tenant.requiredFields,
        aiSettings: lead.tenant.aiSettings,
      },
    });

    // 4. Aplica regras de pipeline e atualiza funil
    await this.pipelineService.applyAiResult(tenantId, lead.id, aiResult, messages.map((m) => m.id));

    // 5. Marca mensagens como processadas
    await this.messagesService.markAsProcessed(
      tenantId,
      messages.map((m) => m.id),
    );

    this.logger.log(
      `[Job ${job.id}] ✅ Processamento concluído: lead=${leadId} intent=${aiResult.intent} confidence=${aiResult.confidenceScore}`,
    );
  }

  @OnQueueFailed()
  onJobFailed(job: Job<ProcessMessagesJobData>, error: Error): void {
    const { tenantId, chatId } = job.data;
    this.logger.error(
      `[Job ${job.id}] ❌ Falha (tentativa ${job.attemptsMade + 1}): tenantId=${tenantId} chatId=${chatId} — ${error.message}`,
      error.stack,
    );
  }
}
