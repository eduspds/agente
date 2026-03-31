import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Source } from '@prisma/client';

export interface CreateAuditLogData {
  tenantId: string;
  leadId: string;
  userId?: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  source: Source;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: CreateAuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        leadId: data.leadId,
        userId: data.userId,
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        source: data.source,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      },
    });
  }

  async logMany(entries: CreateAuditLogData[]): Promise<void> {
    if (entries.length === 0) return;
    await this.prisma.auditLog.createMany({
      data: entries.map((e) => ({
        tenantId: e.tenantId,
        leadId: e.leadId,
        userId: e.userId,
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
        source: e.source,
        metadata: e.metadata ? JSON.parse(JSON.stringify(e.metadata)) : undefined,
      })),
    });
  }
}
