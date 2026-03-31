import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import {
  AiAnalyzeInput,
  AiAnalyzeResult,
  AiResponseSchema,
} from './dto/ai-response.dto';
import { AiPromptService } from './ai-prompt.service';
import {
  parseAiSettingsJson,
  type TenantAiRuntime,
} from '../tenants/tenant-ai.runtime';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly promptService: AiPromptService,
    @InjectRedis() private readonly redis: Redis,
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

  async analyze(input: AiAnalyzeInput): Promise<AiAnalyzeResult> {
    const { lead, messages, tenant } = input;
    const messageIds = messages.map((m) => m.id);
    const rt = parseAiSettingsJson(tenant.aiSettings, this.envFallbacks());

    const promptSent = this.promptService.buildPrompt({
      promptTemplate: tenant.aiPrompt,
      phone: lead.phone,
      messages: messages.map((m) => ({
        body: m.body,
        timestamp: m.timestamp,
        fromMe: m.fromMe,
      })),
      maxMessages: rt.truncateMaxMessages,
      maxChars: rt.truncateMaxChars,
    });

    const cacheKey = `ai:cache:${crypto
      .createHash('sha256')
      .update(promptSent)
      .digest('hex')}`;

    const cacheTtl =
      rt.cacheTtlSeconds > 0 ? rt.cacheTtlSeconds : 3600;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(
        `Cache HIT para lead=${lead.id} — ${messages.length} mensagens`,
      );
      const parsed = JSON.parse(cached) as AiAnalyzeResult;
      return {
        ...parsed,
        cacheHit: true,
        messageIds,
        promptVersion: tenant.promptVersion,
      };
    }

    const start = Date.now();
    let rawResponse = '';
    let tokensUsed: number | null = null;
    const maxRetries = rt.maxRetries > 0 ? rt.maxRetries : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const out = await this.completeJson(rt, promptSent);
        rawResponse = out.text;
        tokensUsed = out.tokensUsed;
        break;
      } catch (error) {
        const isRetryable =
          error instanceof Error &&
          (error.message.includes('timeout') ||
            error.message.includes('500') ||
            error.message.includes('503'));

        this.logger.warn(
          `IA tentativa ${attempt}/${maxRetries} falhou: ${error instanceof Error ? error.message : String(error)}`,
        );

        if (!isRetryable || attempt === maxRetries) throw error;

        await sleep(Math.pow(2, attempt) * 1000);
      }
    }

    const latencyMs = Date.now() - start;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawResponse);
    } catch {
      this.logger.error(
        `Resposta da IA não é JSON válido: ${rawResponse.substring(0, 200)}`,
      );
      throw new Error('Resposta da IA não é JSON válido');
    }

    const validation = AiResponseSchema.safeParse(parsedJson);
    if (!validation.success) {
      this.logger.error(
        `Validação Zod falhou: ${validation.error.message} — resposta: ${rawResponse.substring(0, 200)}`,
      );
      throw new Error(
        `Resposta da IA inválida: ${validation.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`,
      );
    }

    const aiData = validation.data;
    const needsHumanReview = aiData.confidenceScore < rt.confidenceThreshold;

    this.logger.log(
      `IA concluída: lead=${lead.id} intent=${aiData.intent} confidence=${aiData.confidenceScore} latency=${latencyMs}ms tokens=${tokensUsed} cacheHit=false`,
    );

    const result: AiAnalyzeResult = {
      ...aiData,
      promptSent,
      rawResponse,
      cacheHit: false,
      tokensUsed,
      latencyMs,
      messageIds,
      promptVersion: tenant.promptVersion,
      needsHumanReview,
    };

    if (cacheTtl > 0) {
      await this.redis.setex(cacheKey, cacheTtl, JSON.stringify(result));
    }

    return result;
  }

  private async completeJson(
    rt: TenantAiRuntime,
    userPrompt: string,
  ): Promise<{ text: string; tokensUsed: number | null }> {
    if (rt.provider === 'google') {
      return this.completeGemini(rt, userPrompt);
    }
    if (rt.provider === 'anthropic') {
      return this.completeAnthropic(rt, userPrompt);
    }
    return this.completeOpenAiCompatible(rt, userPrompt);
  }

  private async completeOpenAiCompatible(
    rt: TenantAiRuntime,
    userPrompt: string,
  ): Promise<{ text: string; tokensUsed: number | null }> {
    if (!rt.apiKey) {
      throw new Error('Chave de API não configurada');
    }
    const base =
      rt.provider === 'custom' && rt.baseUrl
        ? rt.baseUrl.replace(/\/$/, '')
        : 'https://api.openai.com/v1';
    const client = new OpenAI({
      apiKey: rt.apiKey,
      baseURL: base,
      timeout: rt.timeoutMs,
    });
    const response = await client.chat.completions.create({
      model: rt.model,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: rt.maxTokens,
      temperature: Math.min(rt.temperature, 2),
      response_format: { type: 'json_object' },
    });
    const text = response.choices[0]?.message?.content ?? '';
    return {
      text,
      tokensUsed: response.usage?.total_tokens ?? null,
    };
  }

  private async completeGemini(
    rt: TenantAiRuntime,
    userPrompt: string,
  ): Promise<{ text: string; tokensUsed: number | null }> {
    if (!rt.apiKey) {
      throw new Error('Chave de API (Google) não configurada');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rt.model)}:generateContent?key=${encodeURIComponent(rt.apiKey)}`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), rt.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: Math.min(rt.temperature, 2),
            maxOutputTokens: rt.maxTokens,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()).slice(0, 300) || res.statusText);
      }
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        usageMetadata?: { totalTokenCount?: number };
      };
      const text =
        data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ??
        '';
      return {
        text,
        tokensUsed: data.usageMetadata?.totalTokenCount ?? null,
      };
    } finally {
      clearTimeout(t);
    }
  }

  private async completeAnthropic(
    rt: TenantAiRuntime,
    userPrompt: string,
  ): Promise<{ text: string; tokensUsed: number | null }> {
    if (!rt.apiKey) {
      throw new Error('Chave de API (Anthropic) não configurada');
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), rt.timeoutMs);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': rt.apiKey as string,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: rt.model,
          max_tokens: rt.maxTokens,
          temperature: Math.min(rt.temperature, 2),
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) {
        throw new Error((await res.text()).slice(0, 300) || res.statusText);
      }
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const block = data.content?.find((c) => c.type === 'text');
      const text = block?.text ?? '';
      const tokensUsed =
        data.usage != null
          ? (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0)
          : null;
      return { text, tokensUsed };
    } finally {
      clearTimeout(t);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
