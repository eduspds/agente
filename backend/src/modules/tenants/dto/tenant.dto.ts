import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const UpdateTenantSettingsSchema = z.object({
  aiPrompt: z.string().min(10, 'Prompt deve ter no mínimo 10 caracteres').optional(),
  requiredFields: z
    .array(z.string())
    .min(1, 'Deve ter ao menos 1 campo obrigatório')
    .optional(),
  name: z.string().min(2).max(100).optional(),
});

export type UpdateTenantSettingsDto = z.infer<typeof UpdateTenantSettingsSchema>;

export class UpdateTenantSettingsDtoSwagger {
  @ApiPropertyOptional({ example: 'Você é um assistente de qualificação...' })
  aiPrompt?: string;

  @ApiPropertyOptional({ example: ['name', 'plate', 'email'] })
  requiredFields?: string[];

  @ApiPropertyOptional({ example: 'Minha Empresa' })
  name?: string;
}
