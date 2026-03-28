import { Logger } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AppConfig } from '../../config/configuration'

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class DashboardGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server

  private readonly logger = new Logger(DashboardGateway.name)

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig>,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const raw = client.handshake.auth
      const token =
        (typeof raw === 'object' && raw !== null && 'token' in raw
          ? (raw as { token?: string }).token
          : undefined) ?? undefined
      if (!token || typeof token !== 'string') {
        client.disconnect()
        return
      }
      const secret = this.config.get('jwt.secret', { infer: true })
      if (!secret) {
        client.disconnect()
        return
      }
      const payload = this.jwt.verify<{ tenantId: string }>(token, { secret })
      void client.join(`tenant:${payload.tenantId}`)
    } catch {
      this.logger.warn('Socket rejeitado: token inválido')
      client.disconnect()
    }
  }

  emitLeadUpdated(
    tenantId: string,
    data: { leadId: string; status: string; chatId: string },
  ): void {
    this.server.to(`tenant:${tenantId}`).emit('lead:updated', data)
  }
}
