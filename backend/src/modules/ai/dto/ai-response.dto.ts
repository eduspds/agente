import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// ─── Schema Zod de validação da resposta da IA (seção 8) ─────────────────────

export const AiResponseSchema = z.object({
  intent: z.enum(['NEGOCIACAO', 'SUPORTE', 'SOCIAL']),
  sentiment: z.enum(['POSITIVO', 'NEUTRO', 'NEGATIVO']),
  confidenceScore: z.number().min(0).max(1),
  extractedFields: z.object({
    name: z.string().nullable(),
    plate: z.string().nullable(),
    email: z.string().email().nullable().or(z.literal(null)),
  }),
  summary: z.string(),
  missingFields: z.array(z.string()),
  disqualifyReason: z.string().nullable(),
});

export type AiResponse = z.infer<typeof AiResponseSchema>;

// ─── Contexto de entrada para o serviço de IA ─────────────────────────────────

export interface AiAnalyzeInput {
  lead: {
    id: string;
    phone: string;
    humanOverrideFields: string[];
  };
  messages: Array<{
    id: string;
    body: string;
    timestamp: Date;
    fromMe: boolean;
  }>;
  appSettings: {
    aiPrompt: string;
    promptVersion: number;
    requiredFields: string[];
    aiSettings?: Prisma.JsonValue;
  };
}

// ─── Resultado completo do AiService (inclui metadados de observabilidade) ───

export interface AiAnalyzeResult extends AiResponse {
  promptSent: string;
  rawResponse: string;
  cacheHit: boolean;
  tokensUsed: number | null;
  latencyMs: number;
  messageIds: string[];
  promptVersion: number;
  needsHumanReview: boolean;
}
