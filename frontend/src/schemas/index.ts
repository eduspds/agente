import { z } from 'zod';

// ─── Lead ─────────────────────────────────────────────────────────────────────
export const UpdateLeadSchema = z.object({
  name: z.string().max(120).optional().or(z.literal('')),
  plate: z
    .string()
    .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$|^$/, {
      message: 'Placa inválida (ex: ABC1234 ou ABC1D23)',
    })
    .optional()
    .or(z.literal('')),
  email: z.string().email({ message: 'E-mail inválido' }).optional().or(z.literal('')),
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

export type UpdateLeadFormData = z.infer<typeof UpdateLeadSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Mínimo 6 caracteres' }),
});

export type LoginFormData = z.infer<typeof LoginSchema>;

// ─── Users ────────────────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  name: z.string().min(2, { message: 'Nome obrigatório' }).max(80),
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z
    .string()
    .min(8, { message: 'Mínimo 8 caracteres' })
    .regex(/[a-z]/, { message: 'Deve conter ao menos uma letra minúscula' })
    .regex(/[A-Z]/, { message: 'Deve conter ao menos uma letra maiúscula' })
    .regex(/[0-9]/, { message: 'Deve conter ao menos um número' }),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']),
});

export type CreateUserFormData = z.infer<typeof CreateUserSchema>;

export const EditUserSchema = z.object({
  name: z.string().min(2, { message: 'Nome obrigatório' }).max(80),
  email: z.string().email({ message: 'E-mail inválido' }),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, { message: 'Mínimo 8 caracteres' })
    .refine((v) => !v || /[a-z]/.test(v), {
      message: 'Deve conter ao menos uma letra minúscula',
    })
    .refine((v) => !v || /[A-Z]/.test(v), {
      message: 'Deve conter ao menos uma letra maiúscula',
    })
    .refine((v) => !v || /[0-9]/.test(v), {
      message: 'Deve conter ao menos um número',
    }),
});

export type EditUserFormData = z.infer<typeof EditUserSchema>;

// ─── Settings ─────────────────────────────────────────────────────────────────
export const SettingsSchema = z.object({
  name: z.string().min(2, { message: 'Nome obrigatório' }).max(80),
  aiPrompt: z.string().min(10, { message: 'Prompt muito curto' }).max(8000),
  requiredFields: z
    .array(z.string())
    .min(1, { message: 'Informe ao menos um campo' }),
});

export type SettingsFormData = z.infer<typeof SettingsSchema>;

// ─── WhatsApp (sessão única) ─────────────────────────────────────────────────
export const ConfigureWhatsAppSessionSchema = z.object({
  name: z.string().min(2, { message: 'Nome obrigatório' }).max(60),
  instanceName: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-_]+$/, {
      message: 'Apenas letras minúsculas, números, - e _',
    }),
});

export type ConfigureWhatsAppSessionFormData = z.infer<
  typeof ConfigureWhatsAppSessionSchema
>;
