import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { AppConfig } from '../../config/configuration'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService<AppConfig>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    })

    if (!user) throw new UnauthorizedException('Credenciais inválidas')
    const valid = await bcrypt.compare(dto.password, user.password)
    if (!valid) throw new UnauthorizedException('Credenciais inválidas')

    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.secret', { infer: true }),
      expiresIn: this.config.get('jwt.expiresIn', { infer: true }),
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.refreshSecret', { infer: true }),
      expiresIn: this.config.get('jwt.refreshExpiresIn', { infer: true }),
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: user.tenant,
      },
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string
        email: string
        role: string
        tenantId: string
      }>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret', { infer: true }),
      })

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, active: true },
      })
      if (!user) throw new UnauthorizedException()

      const newPayload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId }
      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.config.get('jwt.secret', { infer: true }),
        expiresIn: this.config.get('jwt.expiresIn', { infer: true }),
      })

      return { accessToken }
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }
  }
}
