import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const UpdateLeadSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(200).optional(),
  plate: z.string().min(1).max(20).optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
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

export type LoginFormData = z.infer<typeof LoginSchema>;
export type UpdateLeadFormData = z.infer<typeof UpdateLeadSchema>;
