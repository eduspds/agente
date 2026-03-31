import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MessageProducer } from './message.producer';
import { MessageProcessor } from './message.processor';
import { QUEUE_MESSAGE_PROCESSING } from './queues.constants';
import { MessagesModule } from '../messages/messages.module';
import { AiModule } from '../ai/ai.module';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host') ?? 'localhost',
          port: config.get<number>('redis.port') ?? 6379,
          password: config.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: false,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUE_MESSAGE_PROCESSING,
    }),
    MessagesModule,
    AiModule,
    PipelineModule,
  ],
  providers: [MessageProducer, MessageProcessor],
  exports: [MessageProducer, BullModule],
})
export class QueuesModule {}
