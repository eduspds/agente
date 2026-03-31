import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAppSettingsSchema } from './dto/app-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly aiSettingsService: AiSettingsService,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter configurações da aplicação (apenas ADMIN)' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Get('ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter configuração completa da IA (apenas ADMIN)' })
  async getAiConfig() {
    return this.aiSettingsService.getAiConfig();
  }

  @Put('ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Salvar configuração da IA (apenas ADMIN)' })
  async putAiConfig(@Body() body: unknown) {
    return this.aiSettingsService.updateAiConfig(body);
  }

  @Post('ai/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Testar conexão com o provedor de IA (apenas ADMIN)' })
  async testAiConnection(@Body() body: unknown) {
    return this.aiSettingsService.testConnection(body);
  }

  @Patch()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar configurações da aplicação (apenas ADMIN)' })
  @ApiResponse({ status: 200 })
  async updateSettings(@Body() body: unknown) {
    const result = UpdateAppSettingsSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.settingsService.updateSettings(result.data);
  }
}
