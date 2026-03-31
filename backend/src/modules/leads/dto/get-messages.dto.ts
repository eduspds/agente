import { z } from 'zod';

export const GetMessagesDtoSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetMessagesDto = z.infer<typeof GetMessagesDtoSchema>;

/** Documentação / validação opcional da forma da resposta HTTP */
export const PaginatedMessagesResponseDtoSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      body: z.string(),
      fromMe: z.boolean(),
      timestamp: z.string().datetime(),
      processed: z.boolean(),
    }),
  ),
  nextCursor: z.string().uuid().nullable(),
  total: z.number(),
  latestAnalysis: z
    .object({
      id: z.string().uuid(),
      intent: z.enum(['NEGOCIACAO', 'SUPORTE', 'SOCIAL']),
      sentiment: z.enum(['POSITIVO', 'NEUTRO', 'NEGATIVO']),
      confidenceScore: z.number(),
      extractedFields: z.object({
        name: z.string().nullable(),
        plate: z.string().nullable(),
        email: z.string().nullable(),
      }),
      summary: z.string(),
      missingFields: z.array(z.string()),
      promptVersion: z.number(),
      createdAt: z.string().datetime(),
    })
    .nullable(),
});

export type PaginatedMessagesResponseZ = z.infer<
  typeof PaginatedMessagesResponseDtoSchema
>;

export interface MessageRowDto {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: string;
  processed: boolean;
}

export interface LatestAnalysisDto {
  id: string;
  intent: 'NEGOCIACAO' | 'SUPORTE' | 'SOCIAL';
  sentiment: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';
  confidenceScore: number;
  extractedFields: {
    name: string | null;
    plate: string | null;
    email: string | null;
  };
  summary: string;
  missingFields: string[];
  promptVersion: number;
  createdAt: string;
}

export interface PaginatedMessagesResponseDto {
  data: MessageRowDto[];
  nextCursor: string | null;
  total: number;
  latestAnalysis: LatestAnalysisDto | null;
}
