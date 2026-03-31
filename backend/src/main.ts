import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    // rawBody necessário para validação HMAC do webhook da baileys API
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const corsOrigin = configService.get<string>('app.corsOrigin') ?? '*';
  const nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development';

  // ─── Prefixo global ────────────────────────────────────────────────────────
  app.setGlobalPrefix(apiPrefix);

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-Request-ID',
    ],
  });

  // ─── Pipe de validação global (class-validator) ────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // remove campos não declarados no DTO
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger (apenas em non-production) ───────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LeadWatch API')
      .setDescription(
        'Inteligência de vendas via monitoramento passivo de WhatsApp (instância única)',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Autenticação e tokens')
      .addTag('leads', 'Gestão de leads')
      .addTag('dashboard', 'Estatísticas e métricas')
      .addTag('webhooks', 'Integração baileys API')
      .addTag('settings', 'Configurações da aplicação')
      .addTag('whatsapp', 'Sessão WhatsApp (Baileys) global')
      .addTag('debug', 'Debug e inspeção (apenas ADMIN)')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // ─── Graceful shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(
    `[LeadWatch] Servidor rodando em http://localhost:${port}/${apiPrefix}`,
  );

  if (nodeEnv !== 'production') {
    console.log(
      `[LeadWatch] Swagger disponível em http://localhost:${port}/${apiPrefix}/docs`,
    );
  }
}

void bootstrap();
