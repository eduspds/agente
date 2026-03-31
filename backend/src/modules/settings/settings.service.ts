import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAppSettingsDto } from './dto/app-settings.dto';
import { Prisma, AppSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { APP_SETTINGS_ID } from '../../common/constants/app-settings';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<AppSettings> {
    const row = await this.prisma.appSettings.findUnique({
      where: { id: APP_SETTINGS_ID },
    });
    if (!row) {
      throw new NotFoundException('Configurações da aplicação não encontradas');
    }
    return row;
  }

  async updateSettings(dto: UpdateAppSettingsDto): Promise<AppSettings> {
    const current = await this.getSettings();

    const data: Prisma.AppSettingsUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.requiredFields !== undefined) data.requiredFields = dto.requiredFields;

    if (dto.aiPrompt !== undefined) {
      data.aiPrompt = dto.aiPrompt;
      if (dto.aiPrompt !== current.aiPrompt) {
        data.promptVersion = { increment: 1 };
      }
    }

    return this.prisma.appSettings.update({
      where: { id: APP_SETTINGS_ID },
      data,
    });
  }
}
