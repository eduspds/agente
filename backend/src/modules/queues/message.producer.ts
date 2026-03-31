import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';
import {
  JOB_PROCESS_MESSAGES,
  ProcessMessagesJobData,
  QUEUE_MESSAGE_PROCESSING,
} from './queues.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { parseAiSettingsJson } from '../tenants/tenant-ai.runtime';

@Injectable()
export class MessageProducer {
  private readonly logger = new Logger(MessageProducer.name);
  private readonly defaultDebounceMs: number;

  constructor(
    @InjectQueue(QUEUE_MESSAGE_PROCESSING)
    private readonly messageQueue: Queue<ProcessMessagesJobData>,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.defaultDebounceMs =
      this.configService.get<number>('queue.debounceMs') ?? 180_000;
  }

  async scheduleProcessing(
    tenantId: string,
    chatId: string,
    leadId: string,
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { aiSettings: true },
    });
    const rt = parseAiSettingsJson(tenant?.aiSettings, {
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
    const debounceMs = Math.round(
      Math.min(60, Math.max(1, rt.debounceMinutes)) * 60_000,
    );
    // jobId determinístico por chatId garante que só existe 1 job pendente por conversa
    const jobId = `${tenantId}:${chatId}`;

    // Remove job pendente anterior (debounce — seção 9.1)
    const existingJob = await this.messageQueue.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'delayed' || state === 'waiting') {
        await existingJob.remove();
        this.logger.debug(
          `Job anterior removido para debounce: ${jobId}`,
        );
      }
    }

    const jobData: ProcessMessagesJobData = {
      tenantId,
      chatId,
      leadId,
      triggeredAt: new Date().toISOString(),
    };

    await this.messageQueue.add(JOB_PROCESS_MESSAGES, jobData, {
      jobId,
      delay: debounceMs,
      attempts: this.configService.get<number>('queue.maxRetries') ?? 3,
      backoff: {
        type: 'exponential',
        delay: this.configService.get<number>('queue.backoffMs') ?? 5_000,
      },
      removeOnComplete: 100,   // mantém últimos 100 jobs completados para debug
      removeOnFail: false,     // mantém falhos para análise na DLQ
    });

    this.logger.log(
      `Job agendado: ${jobId} — delay=${debounceMs}ms (padrão fila=${this.defaultDebounceMs}ms)`,
    );
  }
}
