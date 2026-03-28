import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../prisma/prisma.service'
import { AppConfig } from '../../../config/configuration'
import { User } from '@prisma/client'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  tenantId: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AppConfig>,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret', { infer: true }) ?? '',
    })
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, active: true },
    })
    if (!user) throw new UnauthorizedException('Usuário não encontrado ou inativo')
    return user
  }
}
