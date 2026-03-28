import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'crypto'
import { InjectRedis } from '@nestjs-modules/ioredis'
import Redis from 'ioredis'
import { AppConfig } from '../../config/configuration'
import { AiResponseSchema, AiResponse } from './dto/ai-response.dto'
import { PrismaService } from '../../prisma/prisma.service'

const AI_CACHE_TTL = 3600

interface TenantAiConfig {
  aiApiKey: string
  aiBaseUrl: string
  aiModel: string
  aiTimeoutMs: number
  aiPrompt: string
  promptVersion: number
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(
    private config: ConfigService<AppConfig>,
    @InjectRedis() private redis: Redis,
    private prisma: PrismaService,
  ) {}

  async analyzeForTenant(
    tenantId: string,
    messages: string[],
    phone: string,
  ): Promise<AiResponse> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, active: true },
      select: {
        aiApiKey: true,
        aiBaseUrl: true,
        aiModel: true,
        aiTimeoutMs: true,
        aiPrompt: true,
        promptVersion: true,
      },
    })
    if (!tenant) {
      throw new Error('Tenant não encontrado')
    }

    const apiKey = tenant.aiApiKey?.trim() || this.config.get('ai.apiKey', { infer: true }) || ''
    const baseUrl =
      tenant.aiBaseUrl?.trim() || this.config.get('ai.baseUrl', { infer: true }) || ''
    const model = tenant.aiModel?.trim() || this.config.get('ai.model', { infer: true }) || ''
    const timeoutMs =
      tenant.aiTimeoutMs || this.config.get('ai.timeoutMs', { infer: true }) || 30000

    const cfg: TenantAiConfig = {
      aiApiKey: apiKey,
      aiBaseUrl: baseUrl,
      aiModel: model,
      aiTimeoutMs: timeoutMs,
      aiPrompt: tenant.aiPrompt,
      promptVersion: tenant.promptVersion,
    }

    return this.analyzeWithConfig(cfg, messages, phone, tenantId)
  }

  private async analyzeWithConfig(
    tenantCfg: TenantAiConfig,
    messages: string[],
    phone: string,
    tenantId: string,
  ): Promise<AiResponse> {
    const cacheKey = `ai:${tenantId}:${createHash('md5').update(messages.join('|')).digest('hex')}`

    const cached = await this.redis.get(cacheKey)
    if (cached) {
      this.logger.log(`Cache HIT: ${cacheKey}`)
      return AiResponseSchema.parse(JSON.parse(cached) as unknown) as AiResponse
    }

    const fullPrompt = tenantCfg.aiPrompt
      .replace('{phone}', phone)
      .replace('{messages}', messages.join('\n'))

    const start = Date.now()
    const result = await this.callWithRetry(fullPrompt, tenantCfg)
    const latency = Date.now() - start
    this.logger.log(`IA respondeu em ${latency}ms | Cache MISS`)

    const parsed = AiResponseSchema.parse(result)

    await this.redis.setex(cacheKey, AI_CACHE_TTL, JSON.stringify(parsed))

    return parsed
  }

  private async callWithRetry(prompt: string, tenantCfg: TenantAiConfig, attempt = 1): Promise<unknown> {
    const maxRetries = this.config.get('ai.maxRetries', { infer: true }) ?? 3
    try {
      return await this.callApi(prompt, tenantCfg)
    } catch (error) {
      if (attempt >= maxRetries) throw error
      this.logger.warn(`Tentativa ${attempt} falhou. Retentando...`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      return this.callWithRetry(prompt, tenantCfg, attempt + 1)
    }
  }

  private async callApi(prompt: string, tenantCfg: TenantAiConfig): Promise<unknown> {
    const maxTokens = this.config.get('ai.maxTokens', { infer: true }) ?? 1000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), tenantCfg.aiTimeoutMs)

    try {
      const response = await fetch(`${tenantCfg.aiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantCfg.aiApiKey}`,
        },
        body: JSON.stringify({
          model: tenantCfg.aiModel,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`IA API retornou ${response.status}`)

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }
      const content = data.choices[0]?.message?.content ?? '{}'
      return JSON.parse(content) as unknown
    } finally {
      clearTimeout(timeout)
    }
  }
}
