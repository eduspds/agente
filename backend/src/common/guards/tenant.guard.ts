import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Tipagem do payload JWT injetado pelo JwtAuthGuard
export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: string;
  tenantId: string;
}

// Extensão do Request para incluir o user após autenticação JWT
declare module 'express' {
  interface Request {
    user?: JwtPayload;
    tenantId?: string;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Rotas marcadas como @Public() ignoram a validação de tenant
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Token de autenticação ausente');
    }

    if (!user.tenantId) {
      this.logger.warn(
        `Usuário ${user.sub} sem tenantId no token — acesso negado`,
      );
      throw new ForbiddenException(
        'Token inválido: ausência de identificador de tenant',
      );
    }

    // Injeta o tenantId no request para uso nos controllers e services
    request.tenantId = user.tenantId;

    // Valida consistência: se X-Tenant-ID header for enviado, deve coincidir
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== user.tenantId) {
      this.logger.warn(
        `Conflito de tenantId: header=${headerTenantId}, token=${user.tenantId}`,
      );
      throw new ForbiddenException(
        'X-Tenant-ID não corresponde ao tenant do token',
      );
    }

    return true;
  }
}
