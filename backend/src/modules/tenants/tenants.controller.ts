import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TenantsService } from './tenants.service';
import { AiSettingsService } from './ai-settings.service';
import {
  UpdateTenantSettingsDtoSwagger,
  UpdateTenantSettingsSchema,
} from './dto/tenant.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('settings')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly aiSettingsService: AiSettingsService,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter configurações do tenant (apenas ADMIN)' })
  async getSettings(@Req() req: Request) {
    return this.tenantsService.getSettings(req.tenantId as string);
  }

  @Get('ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter configuração completa da IA (apenas ADMIN)' })
  async getAiConfig(@Req() req: Request) {
    return this.aiSettingsService.getAiConfig(req.tenantId as string);
  }

  @Put('ai')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Salvar configuração da IA (apenas ADMIN)' })
  async putAiConfig(@Req() req: Request, @Body() body: unknown) {
    return this.aiSettingsService.updateAiConfig(
      req.tenantId as string,
      body,
    );
  }

  @Post('ai/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Testar conexão com o provedor de IA (apenas ADMIN)' })
  async testAiConnection(@Body() body: unknown) {
    return this.aiSettingsService.testConnection(body);
  }

  @Patch()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar configurações do tenant (apenas ADMIN)' })
  @ApiResponse({ status: 200 })
  async updateSettings(@Req() req: Request, @Body() body: unknown) {
    const result = UpdateTenantSettingsSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.tenantsService.updateSettings(
      req.tenantId as string,
      result.data,
    );
  }
}
