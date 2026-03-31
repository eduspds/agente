import { Prisma } from '@prisma/client';

export type AiProviderId = 'google' | 'openai' | 'anthropic' | 'custom';

export interface AiSettingsRuntime {
  provider: AiProviderId;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
  cacheTtlSeconds: number;
  truncateMaxMessages: number;
  truncateMaxChars: number;
  qualificationKeywords: string[];
  disqualificationKeywords: string[];
  debounceMinutes: number;
  confidenceThreshold: number;
}

export interface AiEnvFallbacks {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxTokens: number;
  confidenceThreshold: number;
}

const PROVIDERS: AiProviderId[] = ['google', 'openai', 'anthropic', 'custom'];

function asProvider(v: unknown): AiProviderId {
  if (typeof v === 'string' && (PROVIDERS as string[]).includes(v)) {
    return v as AiProviderId;
  }
  return 'openai';
}

export function parseAiSettingsJson(
  raw: Prisma.JsonValue | null | undefined,
  env: AiEnvFallbacks,
): AiSettingsRuntime {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const apiKey =
    typeof o.apiKey === 'string' && o.apiKey.length > 0 ? o.apiKey : undefined;
  const baseUrl =
    typeof o.baseUrl === 'string' && o.baseUrl.length > 0 ? o.baseUrl : undefined;

  return {
    provider: asProvider(o.provider ?? env.provider),
    apiKey: apiKey ?? env.apiKey,
    baseUrl: baseUrl ?? env.baseUrl,
    model: typeof o.model === 'string' && o.model.length > 0 ? o.model : env.model,
    temperature:
      typeof o.temperature === 'number' && !Number.isNaN(o.temperature)
        ? o.temperature
        : 0.3,
    maxTokens:
      typeof o.maxTokens === 'number' && o.maxTokens > 0
        ? o.maxTokens
        : env.maxTokens,
    timeoutMs:
      typeof o.timeoutMs === 'number' && o.timeoutMs > 0
        ? o.timeoutMs
        : env.timeoutMs,
    maxRetries:
      typeof o.maxRetries === 'number' && o.maxRetries >= 0 ? o.maxRetries : 3,
    cacheTtlSeconds:
      typeof o.cacheTtlSeconds === 'number' && o.cacheTtlSeconds >= 0
        ? o.cacheTtlSeconds
        : 3600,
    truncateMaxMessages:
      typeof o.truncateMaxMessages === 'number' && o.truncateMaxMessages > 0
        ? o.truncateMaxMessages
        : 50,
    truncateMaxChars:
      typeof o.truncateMaxChars === 'number' && o.truncateMaxChars > 0
        ? o.truncateMaxChars
        : 8000,
    qualificationKeywords: Array.isArray(o.qualificationKeywords)
      ? o.qualificationKeywords.filter((x): x is string => typeof x === 'string')
      : [],
    disqualificationKeywords: Array.isArray(o.disqualificationKeywords)
      ? o.disqualificationKeywords.filter((x): x is string => typeof x === 'string')
      : [],
    debounceMinutes:
      typeof o.debounceMinutes === 'number' && o.debounceMinutes > 0
        ? o.debounceMinutes
        : 3,
    confidenceThreshold:
      typeof o.confidenceThreshold === 'number' &&
      o.confidenceThreshold >= 0 &&
      o.confidenceThreshold <= 1
        ? o.confidenceThreshold
        : env.confidenceThreshold,
  };
}

export function maskApiKey(hasSecret: boolean): string {
  return hasSecret ? '••••••••••••' : '';
}

/** true = não substituir a chave armazenada (mascarada, vazia ou igual). */
export function shouldPreserveApiKey(
  incoming: string | undefined,
  _existingStored?: string,
): boolean {
  if (incoming === undefined || incoming.trim() === '') return true;
  if (/^[•\u2022.\s]+$/.test(incoming)) return true;
  return false;
}
