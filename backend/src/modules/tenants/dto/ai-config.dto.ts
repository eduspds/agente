import { z } from 'zod';

export const AiProviderConfigSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic', 'custom']),
  apiKey: z.string(),
  baseUrl: z.string().url().optional().or(z.literal('')),
});

export const AiModelConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(8192),
  timeoutMs: z.number().int().min(5000).max(120000),
  maxRetries: z.number().int().min(0).max(5),
  cacheTtlSeconds: z.number().int().min(0).max(86400),
});

export const AiPromptConfigSchema = z.object({
  systemPrompt: z.string().min(10).max(16000),
  promptVersion: z.number().int().min(0).optional().nullable(),
  truncateMaxMessages: z.number().int().min(1).max(100),
  truncateMaxChars: z.number().int().min(1000).max(16000),
});

export const AiTriggerConfigSchema = z.object({
  qualificationKeywords: z.array(z.string()),
  disqualificationKeywords: z.array(z.string()),
  debounceMinutes: z.number().int().min(1).max(60),
  confidenceThreshold: z.number().min(0).max(1),
  requiredFields: z.array(z.string()).min(1),
});

export const PutAiConfigBodySchema = z.object({
  provider: AiProviderConfigSchema,
  model: AiModelConfigSchema,
  prompt: AiPromptConfigSchema,
  triggers: AiTriggerConfigSchema,
});

export type PutAiConfigBody = z.infer<typeof PutAiConfigBodySchema>;

export const AiTestBodySchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic', 'custom']),
  apiKey: z.string().min(8, 'Chave de API obrigatória'),
  baseUrl: z.string().url().optional().or(z.literal('')),
  model: z.string().min(1),
});

export type AiTestBody = z.infer<typeof AiTestBodySchema>;
