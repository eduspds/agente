import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConnectionDto } from './dto/connection.dto';

export interface ConnectionResponse {
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
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(row: {
    id: string;
    name: string;
    instanceName: string;
    status: ConnectionStatus;
    phone: string | null;
    qrCode: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }): ConnectionResponse {
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

  async findAll(tenantId: string): Promise<ConnectionResponse[]> {
    const rows = await this.prisma.whatsappConnection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toResponse(r));
  }

  async create(
    tenantId: string,
    dto: CreateConnectionDto,
  ): Promise<ConnectionResponse> {
    const existing = await this.prisma.whatsappConnection.findUnique({
      where: {
        tenantId_instanceName: { tenantId, instanceName: dto.instanceName },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma conexão com este nome de instância',
      );
    }

    // Estado inicial: aguardando pareamento (integração real com Baileys preencheria qrCode)
    const row = await this.prisma.whatsappConnection.create({
      data: {
        tenantId,
        name: dto.name,
        instanceName: dto.instanceName,
        status: ConnectionStatus.QR_PENDING,
        qrCode: null,
      },
    });
    return this.toResponse(row);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const conn = await this.prisma.whatsappConnection.findFirst({
      where: { id, tenantId },
    });
    if (!conn) {
      throw new NotFoundException('Conexão não encontrada');
    }
    await this.prisma.whatsappConnection.delete({ where: { id } });
  }

  async reconnect(tenantId: string, id: string): Promise<ConnectionResponse> {
    const conn = await this.prisma.whatsappConnection.findFirst({
      where: { id, tenantId },
    });
    if (!conn) {
      throw new NotFoundException('Conexão não encontrada');
    }

    const updated = await this.prisma.whatsappConnection.update({
      where: { id },
      data: {
        status: ConnectionStatus.QR_PENDING,
        qrCode: null,
        phone: null,
      },
    });
    return this.toResponse(updated);
  }
}
