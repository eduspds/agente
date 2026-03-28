import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import { Queue } from 'bullmq'
import { createHash } from 'crypto'
import { ConfigService } from '@nestjs/config'
import { AppConfig } from '../../config/configuration'
import { QUEUE_MESSAGE_PROCESSING, JOB_PROCESS_MESSAGES } from './queues.constants'

@Injectable()
export class MessageProducer {
  private readonly logger = new Logger(MessageProducer.name)

  constructor(
    @InjectQueue(QUEUE_MESSAGE_PROCESSING) private queue: Queue,
    private config: ConfigService<AppConfig>,
  ) {}

  private jobIdFor(tenantId: string, chatId: string): string {
    return createHash('sha256').update(`${tenantId}:${chatId}`).digest('hex')
  }

  async scheduleProcessing(chatId: string, tenantId: string): Promise<void> {
    const jobId = this.jobIdFor(tenantId, chatId)
    const debounceMs = this.config.get('queue.debounceMs', { infer: true }) ?? 180000

    const existing = await this.queue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'delayed' || state === 'waiting') {
        await existing.remove()
        this.logger.debug(`Job anterior removido: ${jobId}`)
      }
    }

    await this.queue.add(
      JOB_PROCESS_MESSAGES,
      { chatId, tenantId },
      {
        jobId,
        delay: debounceMs,
        attempts: this.config.get('queue.maxRetries', { infer: true }) ?? 3,
        backoff: {
          type: 'exponential',
          delay: this.config.get('queue.backoffMs', { infer: true }) ?? 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    )

    this.logger.log(`Job agendado: ${jobId} (delay: ${debounceMs}ms)`)
  }
}
