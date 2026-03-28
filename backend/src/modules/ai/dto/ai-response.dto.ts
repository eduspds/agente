import { z } from 'zod'

const plateSchema = z.union([
  z.null(),
  z.string().regex(/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/i),
])

export const AiResponseSchema = z.object({
  intent: z.enum(['NEGOCIACAO', 'SUPORTE', 'SOCIAL']),
  sentiment: z.enum(['POSITIVO', 'NEUTRO', 'NEGATIVO']),
  confidenceScore: z.number().min(0).max(1),
  extractedFields: z.object({
    name: z.string().nullable(),
    plate: plateSchema,
    email: z.union([z.null(), z.string().email()]),
  }),
  mentionedCompany: z.boolean().default(false),
  mentionedLicense: z.boolean().default(false),
  summary: z.string(),
  missingFields: z.array(z.string()),
  disqualifyReason: z.string().nullable(),
})

export type AiResponse = z.infer<typeof AiResponseSchema>
