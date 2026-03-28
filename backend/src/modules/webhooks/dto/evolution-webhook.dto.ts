import { z } from 'zod'

export const EvolutionWebhookSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean(),
      id: z.string(),
    }),
    message: z
      .object({
        conversation: z.string().optional(),
        extendedTextMessage: z.object({ text: z.string() }).optional(),
      })
      .optional(),
    messageTimestamp: z.union([z.number(), z.string()]),
    pushName: z.string().optional(),
  }),
})

export type EvolutionWebhookDto = z.infer<typeof EvolutionWebhookSchema>
