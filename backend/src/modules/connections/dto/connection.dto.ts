import { z } from 'zod';

export const CreateConnectionSchema = z.object({
  name: z.string().min(2).max(60),
  instanceName: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-_]+$/, {
      message: 'Apenas letras minúsculas, números, - e _',
    }),
});

export type CreateConnectionDto = z.infer<typeof CreateConnectionSchema>;
