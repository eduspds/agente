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
import { JwtPayload } from '../../common/auth/jwt-payload';

@WebSocketGateway({
  cors: {
    origin: '*',
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

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway inicializado');

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

  handleConnection(socket: Socket) {
    const user = (socket as Socket & { user?: JwtPayload }).user;

    if (!user?.sub) {
      socket.disconnect();
      return;
    }

    void socket.join('app');
    this.logger.log(`Cliente conectado: ${socket.id} userId=${user.sub}`);
  }

  handleDisconnect(socket: Socket) {
    const user = (socket as Socket & { user?: JwtPayload }).user;
    this.logger.log(
      `Cliente desconectado: ${socket.id} userId=${user?.sub ?? 'unknown'}`,
    );
  }

  emitLeadUpdated(lead: Record<string, unknown>): void {
    this.server.to('app').emit('lead:updated', lead);
  }

  emitLeadCreated(lead: Record<string, unknown>): void {
    this.server.to('app').emit('lead:created', lead);
  }

  emitStatsUpdated(stats: Record<string, unknown>): void {
    this.server.to('app').emit('stats:updated', stats);
  }
}
