import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Role, User } from '@prisma/client';

type SafeUser = Omit<User, 'password'>;

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: CreateUserDto,
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado neste tenant');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role as Role,
      },
    });

    // Nunca retornar senha
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async findAll(
    tenantId: string,
  ): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async findOne(tenantId: string, id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<SafeUser> {
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email: dto.email } },
      });
      if (emailTaken) {
        throw new ConflictException('E-mail já cadastrado neste tenant');
      }
    }

    const passwordHash =
      dto.password && dto.password.length > 0
        ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
        : undefined;

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.role && { role: dto.role as Role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(passwordHash !== undefined && { password: passwordHash }),
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.findOne(tenantId, id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
