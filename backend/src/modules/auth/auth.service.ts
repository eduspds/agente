import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/auth/jwt-payload';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const invalidatedRefreshTokens = new Set<string>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
    });

    if (!user) {
      await bcrypt.compare(dto.password, '$2b$12$invalidhash000000000000000000000000');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`Login bem-sucedido: userId=${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(
    payload: JwtPayload,
    rawRefreshToken: string,
  ): Promise<{ accessToken: string }> {
    if (invalidatedRefreshTokens.has(rawRefreshToken)) {
      throw new UnauthorizedException(
        'Refresh token inválido ou já utilizado',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado ou inativo');
    }

    const accessToken = await this.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    invalidatedRefreshTokens.add(refreshToken);
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  private signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') ?? '15m',
    });
  }

  private signRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn:
        this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d',
    });
  }
}
