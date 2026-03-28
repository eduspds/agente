import { z } from 'zod'
import { LeadStatus } from '@prisma/client'

const MAX_PAGE = 50

export const ListLeadsQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(MAX_PAGE).optional().default(20),
  cursor: z.string().uuid().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
})

export type ListLeadsQueryDto = z.infer<typeof ListLeadsQuerySchema>

export const CreateLeadSchema = z.object({
  chatId: z.string().min(1),
  phone: z.string().min(1),
  name: z.string().optional(),
  plate: z.string().optional(),
  email: z.string().email().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
})

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>

export const PatchLeadSchema = z
  .object({
    name: z.string().nullable().optional(),
    plate: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    status: z.nativeEnum(LeadStatus).optional(),
    intent: z.string().nullable().optional(),
    sentiment: z.string().nullable().optional(),
  })
  .strict()

export type PatchLeadDto = z.infer<typeof PatchLeadSchema>
