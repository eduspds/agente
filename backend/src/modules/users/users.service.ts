import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { Role } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateUserDto, ListUsersQueryDto, PatchUserDto } from './dto/user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private generateInitialPassword(): string {
    return crypto.randomBytes(9).toString('base64url').slice(0, 12)
  }

  async list(tenantId: string, query: ListUsersQueryDto) {
    const take = query.take
    const items = await this.prisma.user.findMany({
      where: {
        tenantId,
        ...(query.activeOnly ? { active: true } : {}),
      },
      take: take + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    let nextCursor: string | undefined
    if (items.length > take) {
      const last = items.pop()
      nextCursor = last?.id
    }

    return { items, nextCursor }
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    })
    if (exists) throw new ConflictException('E-mail já cadastrado')

    const plain = this.generateInitialPassword()
    const password = await bcrypt.hash(plain, 12)

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        password,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return { user, initialPassword: plain }
  }

  async countAdmins(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId, role: Role.ADMIN, active: true },
    })
  }

  async patch(id: string, tenantId: string, dto: PatchUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId },
    })
    if (!existing) throw new NotFoundException('Usuário não encontrado')

    if (existing.role === Role.ADMIN && existing.active) {
      const remainsAdmin =
        (dto.role === undefined || dto.role === Role.ADMIN) &&
        (dto.active === undefined || dto.active === true)
      if (!remainsAdmin) {
        const adminCount = await this.countAdmins(tenantId)
        if (adminCount <= 1) {
          throw new ForbiddenException('Não é possível remover o último administrador ativo')
        }
      }
    }

    const data: {
      name?: string
      role?: Role
      active?: boolean
      password?: string
    } = {}

    if (dto.name !== undefined) data.name = dto.name
    if (dto.role !== undefined) data.role = dto.role
    if (dto.active !== undefined) data.active = dto.active
    if (dto.password !== undefined) {
      if (dto.password.length < 8) throw new BadRequestException('Senha muito curta')
      data.password = await bcrypt.hash(dto.password, 12)
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(id, tenantId)
    }

    await this.prisma.user.update({
      where: { id, tenantId },
      data,
    })

    return this.findOne(id, tenantId)
  }
}
