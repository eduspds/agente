import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../common/guards/tenant.guard';

@WebSocketGateway({
  cors: {
    origin: '*', // CORS configurado dinamicamente via env em produção
    credentials: true,
  },
  namespace: '/',
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway inicializado');

    // Middleware de autenticação JWT no handshake
    server.use((socket: Socket, next) => {
      const token =
        (socket.handshake.auth.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace('Bearer ', ''));

      if (!token) {
        return next(new Error('Token de autenticação obrigatório'));
      }

      try {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.get<string>('jwt.secret'),
        });

        (socket as Socket & { user?: JwtPayload }).user = payload;
        next();
      } catch {
        next(new Error('Token inválido ou expirado'));
      }
    });
  }

  handleConnection(socket: Socket): void {
    const user = (socket as Socket & { user?: JwtPayload }).user;

    if (!user?.tenantId) {
      socket.disconnect();
      return;
    }

    // Room por tenantId — cada tenant isolado
    void socket.join(`tenant:${user.tenantId}`);
    this.logger.log(
      `Cliente conectado: ${socket.id} tenantId=${user.tenantId}`,
    );
  }

  handleDisconnect(socket: Socket): void {
    const user = (socket as Socket & { user?: JwtPayload }).user;
    this.logger.log(
      `Cliente desconectado: ${socket.id} tenantId=${user?.tenantId ?? 'unknown'}`,
    );
  }

  emitLeadUpdated(tenantId: string, lead: Record<string, unknown>): void {
    this.server.to(`tenant:${tenantId}`).emit('lead:updated', lead);
  }

  emitLeadCreated(tenantId: string, lead: Record<string, unknown>): void {
    this.server.to(`tenant:${tenantId}`).emit('lead:created', lead);
  }

  emitStatsUpdated(tenantId: string, stats: Record<string, unknown>): void {
    this.server.to(`tenant:${tenantId}`).emit('stats:updated', stats);
  }
}
