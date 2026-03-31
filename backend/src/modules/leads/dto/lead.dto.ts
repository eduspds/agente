import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  plate: z.string().min(1).max(20).optional(),
  email: z.string().email().optional(),
  status: z
    .enum([
      'NOVO',
      'EM_QUALIFICACAO',
      'QUALIFICADO',
      'DESQUALIFICADO',
      'ESPECIALISTA',
    ])
    .optional(),
  disqualifyReason: z.string().optional(),
});

export const LeadFiltersSchema = z.object({
  status: z
    .enum([
      'NOVO',
      'EM_QUALIFICACAO',
      'QUALIFICADO',
      'DESQUALIFICADO',
      'ESPECIALISTA',
      'PENDENTE_IDENTIFICACAO',
    ])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  needsHumanReview: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type UpdateLeadDto = z.infer<typeof UpdateLeadSchema>;
export type LeadFiltersDto = z.infer<typeof LeadFiltersSchema>;

export class UpdateLeadDtoSwagger {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  plate?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional({
    enum: ['NOVO', 'EM_QUALIFICACAO', 'QUALIFICADO', 'DESQUALIFICADO', 'ESPECIALISTA'],
  })
  status?: string;

  @ApiPropertyOptional()
  disqualifyReason?: string;
}
