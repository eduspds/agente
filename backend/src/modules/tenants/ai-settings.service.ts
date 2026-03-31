import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AiTestBody,
  PutAiConfigBody,
  PutAiConfigBodySchema,
  AiTestBodySchema,
} from './dto/ai-config.dto';
import {
  maskApiKey,
  parseAiSettingsJson,
  shouldPreserveApiKey,
} from './tenant-ai.runtime';

export interface AiConfigView {
  id: string;
  tenantId: string;
  provider: {
    provider: string;
    apiKey: string;
    baseUrl?: string;
  };
  model: {
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    maxRetries: number;
    cacheTtlSeconds: number;
  };
  prompt: {
    systemPrompt: string;
    promptVersion: number;
    truncateMaxMessages: number;
    truncateMaxChars: number;
  };
  triggers: {
    qualificationKeywords: string[];
    disqualificationKeywords: string[];
    debounceMinutes: number;
    confidenceThreshold: number;
    requiredFields: string[];
  };
  isActive: boolean;
  updatedAt: string;
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number | null;
  model: string | null;
  error: string | null;
}

@Injectable()
export class AiSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private envFallbacks() {
    return {
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
    };
  }

  async getAiConfig(tenantId: string): Promise<AiConfigView> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const env = this.envFallbacks();
    const rt = parseAiSettingsJson(tenant.aiSettings, env);
    const stored = tenant.aiSettings as Record<string, unknown> | null;
    const storedKey =
      stored && typeof stored.apiKey === 'string' && stored.apiKey.length > 0
        ? stored.apiKey
        : undefined;
    const hasSecret = Boolean(storedKey || env.apiKey);

    return {
      id: tenant.id,
      tenantId: tenant.id,
      provider: {
        provider: rt.provider,
        apiKey: maskApiKey(hasSecret),
        baseUrl: rt.baseUrl,
      },
      model: {
        model: rt.model,
        temperature: rt.temperature,
        maxTokens: rt.maxTokens,
        timeoutMs: rt.timeoutMs,
        maxRetries: rt.maxRetries,
        cacheTtlSeconds: rt.cacheTtlSeconds,
      },
      prompt: {
        systemPrompt: tenant.aiPrompt,
        promptVersion: tenant.promptVersion,
        truncateMaxMessages: rt.truncateMaxMessages,
        truncateMaxChars: rt.truncateMaxChars,
      },
      triggers: {
        qualificationKeywords: rt.qualificationKeywords,
        disqualificationKeywords: rt.disqualificationKeywords,
        debounceMinutes: rt.debounceMinutes,
        confidenceThreshold: rt.confidenceThreshold,
        requiredFields: tenant.requiredFields,
      },
      isActive: tenant.isActive,
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  async updateAiConfig(tenantId: string, body: unknown): Promise<AiConfigView> {
    const parsed = PutAiConfigBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', '),
      );
    }
    const dto: PutAiConfigBody = parsed.data;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const prev = tenant.aiSettings as Record<string, unknown> | null;
    const prevKey =
      prev && typeof prev.apiKey === 'string' && prev.apiKey.length > 0
        ? prev.apiKey
        : undefined;

    let nextKey: string | undefined = prevKey;
    if (!shouldPreserveApiKey(dto.provider.apiKey)) {
      const k = dto.provider.apiKey.trim();
      if (k.length >= 8) nextKey = k;
    }

    const env = this.envFallbacks();
    const effectiveKey = nextKey ?? env.apiKey;
    if (!effectiveKey || effectiveKey.length < 8) {
      throw new BadRequestException(
        'Informe uma chave de API válida (mín. 8 caracteres) ou configure AI_API_KEY no servidor.',
      );
    }

    const aiSettings: Record<string, unknown> = {
      provider: dto.provider.provider,
      baseUrl:
        dto.provider.baseUrl && dto.provider.baseUrl.length > 0
          ? dto.provider.baseUrl
          : undefined,
      model: dto.model.model,
      temperature: dto.model.temperature,
      maxTokens: dto.model.maxTokens,
      timeoutMs: dto.model.timeoutMs,
      maxRetries: dto.model.maxRetries,
      cacheTtlSeconds: dto.model.cacheTtlSeconds,
      truncateMaxMessages: dto.prompt.truncateMaxMessages,
      truncateMaxChars: dto.prompt.truncateMaxChars,
      qualificationKeywords: dto.triggers.qualificationKeywords,
      disqualificationKeywords: dto.triggers.disqualificationKeywords,
      debounceMinutes: dto.triggers.debounceMinutes,
      confidenceThreshold: dto.triggers.confidenceThreshold,
    };
    if (nextKey) {
      aiSettings.apiKey = nextKey;
    }

    const promptChanged = dto.prompt.systemPrompt !== tenant.aiPrompt;
    const updateData: {
      aiPrompt: string;
      requiredFields: string[];
      aiSettings: Prisma.InputJsonValue;
      promptVersion?: number;
    } = {
      aiPrompt: dto.prompt.systemPrompt,
      requiredFields: dto.triggers.requiredFields,
      aiSettings: aiSettings as Prisma.InputJsonValue,
    };

    if (promptChanged) {
      updateData.promptVersion = tenant.promptVersion + 1;
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    return this.getAiConfig(tenantId);
  }

  async testConnection(body: unknown): Promise<TestConnectionResult> {
    const parsed = AiTestBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', '),
      );
    }
    const dto: AiTestBody = parsed.data;
    const start = Date.now();

    try {
      if (dto.provider === 'openai' || dto.provider === 'custom') {
        const baseURL =
          dto.provider === 'custom' && dto.baseUrl
            ? dto.baseUrl.replace(/\/$/, '')
            : 'https://api.openai.com/v1';
        const client = new OpenAI({
          apiKey: dto.apiKey,
          baseURL,
          timeout: 25_000,
        });
        await client.chat.completions.create({
          model: dto.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        });
        return {
          success: true,
          latencyMs: Date.now() - start,
          model: dto.model,
          error: null,
        };
      }

      if (dto.provider === 'google') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(dto.model)}:generateContent?key=${encodeURIComponent(dto.apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK in one word.' }] }],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            success: false,
            latencyMs: Date.now() - start,
            model: dto.model,
            error: errText.slice(0, 200) || res.statusText,
          };
        }
        return {
          success: true,
          latencyMs: Date.now() - start,
          model: dto.model,
          error: null,
        };
      }

      if (dto.provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': dto.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: dto.model,
            max_tokens: 16,
            messages: [{ role: 'user', content: 'Reply with OK only.' }],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          return {
            success: false,
            latencyMs: Date.now() - start,
            model: dto.model,
            error: errText.slice(0, 200) || res.statusText,
          };
        }
        return {
          success: true,
          latencyMs: Date.now() - start,
          model: dto.model,
          error: null,
        };
      }

      return {
        success: false,
        latencyMs: null,
        model: null,
        error: 'Provedor não suportado',
      };
    } catch (e) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        model: dto.model,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
