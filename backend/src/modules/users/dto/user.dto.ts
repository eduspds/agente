import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter letras maiúsculas, minúsculas e números',
    ),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('E-mail inválido').optional(),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, {
      message: 'Senha deve ter no mínimo 8 caracteres',
    })
    .refine((v) => !v || /[A-Z]/.test(v), {
      message: 'Senha deve conter ao menos uma letra maiúscula',
    })
    .refine((v) => !v || /[a-z]/.test(v), {
      message: 'Senha deve conter ao menos uma letra minúscula',
    })
    .refine((v) => !v || /\d/.test(v), {
      message: 'Senha deve conter ao menos um número',
    }),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export class CreateUserDtoSwagger {
  @ApiProperty({ example: 'usuario@empresa.com' })
  email!: string;

  @ApiProperty({ example: 'Senha@123' })
  password!: string;

  @ApiProperty({ example: 'João Silva' })
  name!: string;

  @ApiProperty({ enum: ['ADMIN', 'AGENT', 'VIEWER'] })
  role!: string;
}

export class UpdateUserDtoSwagger {
  @ApiPropertyOptional({ example: 'João Silva Atualizado' })
  name?: string;

  @ApiPropertyOptional({ example: 'joao@empresa.com' })
  email?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'AGENT', 'VIEWER'] })
  role?: string;

  @ApiPropertyOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Nova senha (opcional)' })
  password?: string;
}
