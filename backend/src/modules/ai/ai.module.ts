import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiPromptService } from './ai-prompt.service';

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get<string>('redis.host') ?? 'localhost'}:${config.get<number>('redis.port') ?? 6379}`,
        options: {
          password: config.get<string>('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AiService, AiPromptService],
  exports: [AiService, AiPromptService],
})
export class AiModule {}
