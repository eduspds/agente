import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha muito curta'),
})

export type LoginDto = z.infer<typeof LoginSchema>

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório'),
})

export type RefreshDto = z.infer<typeof RefreshSchema>
