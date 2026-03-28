import { z } from 'zod'
import { Role } from '@prisma/client'

const MAX_PAGE = 50

export const ListUsersQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(MAX_PAGE).optional().default(20),
  cursor: z.string().uuid().optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((s) => s === undefined || s !== 'false'),
})

export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.nativeEnum(Role),
})

export type CreateUserDto = z.infer<typeof CreateUserSchema>

export const PatchUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.nativeEnum(Role).optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .strict()

export type PatchUserDto = z.infer<typeof PatchUserSchema>
