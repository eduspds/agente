import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantSettingsDto } from './dto/tenant.dto';
import { Prisma, Tenant } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string): Promise<Omit<Tenant, never>> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return tenant;
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<Tenant> {
    await this.getSettings(tenantId);

    const data: Prisma.TenantUpdateInput = {};

    if (dto.name) data.name = dto.name;
    if (dto.requiredFields) data.requiredFields = dto.requiredFields;
    if (dto.aiPrompt) {
      data.aiPrompt = dto.aiPrompt;
      // Incrementa versão do prompt automaticamente ao alterar
      const current = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { promptVersion: true },
      });
      data.promptVersion = (current?.promptVersion ?? 1) + 1;
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }
}
