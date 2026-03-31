import { z } from 'zod';

export const GetMessagesDtoSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type GetMessagesDto = z.infer<typeof GetMessagesDtoSchema>;

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
