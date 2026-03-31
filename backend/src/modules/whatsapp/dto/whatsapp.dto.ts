import { z } from 'zod';

export const ConfigureWhatsAppSessionSchema = z
  .object({
    name: z.string().min(2).max(60).optional(),
    instanceName: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9-_]+$/, {
        message: 'Apenas letras minúsculas, números, - e _',
      })
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.instanceName !== undefined, {
    message: 'Informe ao menos name ou instanceName',
  });

export type ConfigureWhatsAppSessionDto = z.infer<
  typeof ConfigureWhatsAppSessionSchema
>;

export const SendWhatsAppMessageSchema = z.object({
  to: z.string().min(5).max(80),
  text: z.string().min(1).max(4000),
});

export type SendWhatsAppMessageDto = z.infer<typeof SendWhatsAppMessageSchema>;
