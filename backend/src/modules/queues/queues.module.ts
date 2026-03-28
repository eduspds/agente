import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AppConfig } from '../../config/configuration'
import { QUEUE_MESSAGE_PROCESSING } from './queues.constants'
import { MessageProducer } from './message.producer'
import { MessageProcessor } from './message.processor'
import { MessagesModule } from '../messages/messages.module'
import { AiModule } from '../ai/ai.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { DashboardModule } from '../dashboard/dashboard.module'

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => ({
        connection: {
          host: config.get('redis.host', { infer: true }),
          port: config.get('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }) || undefined,
        },
      }),
    }),
    BullModule.registerQueue({ name: QUEUE_MESSAGE_PROCESSING }),
    MessagesModule,
    AiModule,
    PipelineModule,
    forwardRef(() => DashboardModule),
  ],
  providers: [MessageProducer, MessageProcessor],
  exports: [BullModule, MessageProducer],
})
export class QueuesModule {}
