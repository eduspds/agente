import { z } from 'zod'

export const PatchTenantGeneralSchema = z
  .object({
    name: z.string().min(1).optional(),
    specialistName: z.string().nullable().optional(),
    specialistContact: z.string().nullable().optional(),
  })
  .strict()

export type PatchTenantGeneralDto = z.infer<typeof PatchTenantGeneralSchema>

export const PatchTenantAiSchema = z
  .object({
    aiProvider: z.string().min(1).optional(),
    aiModel: z.string().min(1).optional(),
    aiApiKey: z.string().optional(),
    aiBaseUrl: z.string().min(1).optional(),
    aiTimeoutMs: z.coerce.number().int().min(1000).optional(),
    aiConfidThreshold: z.coerce.number().min(0).max(1).optional(),
    aiPrompt: z.string().optional(),
  })
  .strict()

export type PatchTenantAiDto = z.infer<typeof PatchTenantAiSchema>

export const PatchTenantFunnelSchema = z
  .object({
    requiredFields: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict()

export type PatchTenantFunnelDto = z.infer<typeof PatchTenantFunnelSchema>
