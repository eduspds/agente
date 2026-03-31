import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { configurations } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Módulos de domínio — importados progressivamente a cada fase
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AiModule } from './modules/ai/ai.module';
import { QueuesModule } from './modules/queues/queues.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditModule } from './modules/audit/audit.module';
import { ConnectionsModule } from './modules/connections/connections.module';

@Module({
  imports: [
    // ─── Configuração global (disponível em todo o app via ConfigService) ──────
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      // Valida vars obrigatórias no startup — falha rápido antes de subir
      expandVariables: true,
    }),

    // ─── Banco de dados (global — disponível sem reimportar) ─────────────────
    PrismaModule,

    // ─── Rate limiting global (evita abuso de endpoints públicos) ────────────
    // Trade-off: ThrottlerModule usa memória por padrão; em multi-instância
    // considerar ThrottlerStorageRedisService para consistência entre pods
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,
          limit: 20,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 100,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: 500,
        },
      ],
      inject: [ConfigService],
    }),

    // ─── Módulos de domínio ───────────────────────────────────────────────────
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
    AuditModule,
    ConnectionsModule,
  ],
  providers: [
    // ─── Filtro global de exceções ────────────────────────────────────────────
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // ─── Interceptor de logging estruturado (JSON) ────────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // ─── Guards globais — ordem importa: JWT → Tenant → Roles ────────────────
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // ─── Throttler como guard global ─────────────────────────────────────────
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
