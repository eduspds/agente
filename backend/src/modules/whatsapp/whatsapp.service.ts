import {
  BadGatewayException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WHATSAPP_SESSION_ID } from '../../common/constants/whatsapp-session';
import type { ConfigureWhatsAppSessionDto, SendWhatsAppMessageDto } from './dto/whatsapp.dto';

export interface WhatsAppSessionView {
  id: string;
  name: string;
  instanceName: string;
  status: ConnectionStatus;
  phone: string | null;
  qrCode: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private toView(row: {
    id: string;
    name: string;
    instanceName: string;
    status: ConnectionStatus;
    phone: string | null;
    qrCode: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }): WhatsAppSessionView {
    return {
      id: row.id,
      name: row.name,
      instanceName: row.instanceName,
      status: row.status,
      phone: row.phone,
      qrCode: row.qrCode,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private defaultInstanceName(): string {
    return (
      this.config.get<string>('baileys.defaultInstanceName') ?? 'leadwatch'
    );
  }

  /** Garante a única linha de sessão no banco (sem coleções em memória). */
  async ensureSession(): Promise<WhatsAppSessionView> {
    const instanceName = this.defaultInstanceName();
    const row = await this.prisma.whatsappConnection.upsert({
      where: { id: WHATSAPP_SESSION_ID },
      create: {
        id: WHATSAPP_SESSION_ID,
        name: 'WhatsApp',
        instanceName,
        status: ConnectionStatus.DISCONNECTED,
        qrCode: null,
        phone: null,
      },
      update: {},
    });
    return this.toView(row);
  }

  async getSession(): Promise<WhatsAppSessionView> {
    const row = await this.prisma.whatsappConnection.findUnique({
      where: { id: WHATSAPP_SESSION_ID },
    });
    if (!row) {
      return this.ensureSession();
    }
    return this.toView(row);
  }

  async getStatus(): Promise<{
    status: ConnectionStatus;
    phone: string | null;
    instanceName: string;
    lastSeenAt: string | null;
  }> {
    const s = await this.getSession();
    return {
      status: s.status,
      phone: s.phone,
      instanceName: s.instanceName,
      lastSeenAt: s.lastSeenAt,
    };
  }

  async getQr(): Promise<{ qrCode: string | null; status: ConnectionStatus }> {
    const s = await this.getSession();
    return { qrCode: s.qrCode, status: s.status };
  }

  async configure(dto: ConfigureWhatsAppSessionDto): Promise<WhatsAppSessionView> {
    await this.ensureSession();
    const current = await this.prisma.whatsappConnection.findUniqueOrThrow({
      where: { id: WHATSAPP_SESSION_ID },
    });

    if (dto.instanceName !== undefined) {
      const clash = await this.prisma.whatsappConnection.findFirst({
        where: {
          instanceName: dto.instanceName,
          NOT: { id: WHATSAPP_SESSION_ID },
        },
      });
      if (clash) {
        throw new ConflictException(
          'Já existe registro com este nome de instância',
        );
      }
    }

    const instanceChanged =
      dto.instanceName !== undefined &&
      dto.instanceName !== current.instanceName;

    const row = await this.prisma.whatsappConnection.update({
      where: { id: WHATSAPP_SESSION_ID },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.instanceName !== undefined && { instanceName: dto.instanceName }),
        ...(instanceChanged && {
          status: ConnectionStatus.QR_PENDING,
          qrCode: null,
          phone: null,
        }),
      },
    });
    return this.toView(row);
  }

  async reconnect(): Promise<WhatsAppSessionView> {
    await this.ensureSession();
    const row = await this.prisma.whatsappConnection.update({
      where: { id: WHATSAPP_SESSION_ID },
      data: {
        status: ConnectionStatus.QR_PENDING,
        qrCode: null,
        phone: null,
      },
    });
    return this.toView(row);
  }

  /** Limpa estado local (o sidecar Baileys deve encerrar a sessão por conta própria). */
  async resetSession(): Promise<WhatsAppSessionView> {
    await this.ensureSession();
    const row = await this.prisma.whatsappConnection.update({
      where: { id: WHATSAPP_SESSION_ID },
      data: {
        status: ConnectionStatus.DISCONNECTED,
        qrCode: null,
        phone: null,
        lastSeenAt: null,
      },
    });
    return this.toView(row);
  }

  async sendMessage(dto: SendWhatsAppMessageDto): Promise<{ ok: boolean }> {
    const proxyUrl = this.config.get<string>('baileys.messageProxyUrl');
    if (!proxyUrl) {
      throw new ServiceUnavailableException(
        'Envio não configurado: defina BAILEYS_MESSAGE_URL com o endpoint HTTP do serviço Baileys que aceita { instance, to, text }.',
      );
    }

    const session = await this.getSession();
    const secret = this.config.get<string>('baileys.messageProxySecret');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers.Authorization = `Bearer ${secret}`;
    }

    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instance: session.instanceName,
        to: dto.to,
        text: dto.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new BadGatewayException(
        errText.slice(0, 300) || `Proxy retornou ${res.status}`,
      );
    }

    return { ok: true };
  }
}
