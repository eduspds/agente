import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { RedisModule } from '@nestjs-modules/ioredis'
import { configuration, AppConfig } from './config/configuration'
import { PrismaModule } from './prisma/prisma.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { LeadsModule } from './modules/leads/leads.module'
import { MessagesModule } from './modules/messages/messages.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { AiModule } from './modules/ai/ai.module'
import { QueuesModule } from './modules/queues/queues.module'
import { PipelineModule } from './modules/pipeline/pipeline.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { ConversationsModule } from './modules/conversations/conversations.module'
import { WhatsappModule } from './modules/whatsapp/whatsapp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>) => ({
        type: 'single',
        options: {
          host: config.get('redis.host', { infer: true }),
          port: config.get('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }) || undefined,
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    LeadsModule,
    MessagesModule,
    WebhooksModule,
    AiModule,
    QueuesModule,
    PipelineModule,
    DashboardModule,
    ConversationsModule,
    WhatsappModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
