import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { AppConfig } from './config/configuration'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })

  const configService = app.get(ConfigService<AppConfig>)
  const port = configService.get('app.port', { infer: true }) ?? 3000
  const prefix = configService.get('app.apiPrefix', { infer: true }) ?? 'api/v1'
  const corsOrigin = configService.get('app.corsOrigin', { infer: true }) ?? '*'

  app.setGlobalPrefix(prefix)
  app.enableCors({ origin: corsOrigin, credentials: true })

  await app.listen(port)
  console.log(`🚀 LeadWatch backend rodando em http://localhost:${port}/${prefix}`)
}

void bootstrap()
