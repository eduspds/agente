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
import { APP_SETTINGS_ID } from '../../common/constants/app-settings';

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
    const { chatId, leadId } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.log(
      `[Job ${job.id}] Processando: chatId=${chatId} tentativa=${attempt}`,
    );

    const messages = await this.messagesService.findUnprocessedByChat(chatId);

    if (messages.length === 0) {
      this.logger.warn(
        `[Job ${job.id}] Nenhuma mensagem pendente para chatId=${chatId} — job encerrado`,
      );
      return;
    }

    const [lead, appSettings] = await Promise.all([
      this.prisma.lead.findFirst({
        where: { id: leadId },
      }),
      this.prisma.appSettings.findUnique({
        where: { id: APP_SETTINGS_ID },
        select: {
          aiPrompt: true,
          promptVersion: true,
          requiredFields: true,
          aiSettings: true,
        },
      }),
    ]);

    if (!lead) {
      this.logger.error(
        `[Job ${job.id}] Lead não encontrado: leadId=${leadId}`,
      );
      return;
    }

    if (!appSettings) {
      this.logger.error(
        `[Job ${job.id}] AppSettings não encontrado (id=${APP_SETTINGS_ID})`,
      );
      return;
    }

    this.logger.log(
      `[Job ${job.id}] ${messages.length} mensagens para análise — lead=${leadId}`,
    );

    const aiResult = await this.aiService.analyze({
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
      appSettings: {
        aiPrompt: appSettings.aiPrompt,
        promptVersion: appSettings.promptVersion,
        requiredFields: appSettings.requiredFields,
        aiSettings: appSettings.aiSettings,
      },
    });

    await this.pipelineService.applyAiResult(lead.id, aiResult, messages.map((m) => m.id));

    await this.messagesService.markAsProcessed(messages.map((m) => m.id));

    this.logger.log(
      `[Job ${job.id}] ✅ Processamento concluído: lead=${leadId} intent=${aiResult.intent} confidence=${aiResult.confidenceScore}`,
    );
  }

  @OnQueueFailed()
  onJobFailed(job: Job<ProcessMessagesJobData>, error: Error): void {
    const { chatId } = job.data;
    this.logger.error(
      `[Job ${job.id}] ❌ Falha (tentativa ${job.attemptsMade + 1}): chatId=${chatId} — ${error.message}`,
      error.stack,
    );
  }
}
