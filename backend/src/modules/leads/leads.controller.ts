import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { LeadsService } from './leads.service';
import {
  LeadFiltersSchema,
  UpdateLeadDtoSwagger,
  UpdateLeadSchema,
} from './dto/lead.dto';
import { JwtPayload } from '../../common/guards/tenant.guard';

@ApiTags('leads')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar leads com paginação cursor-based e filtros' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'needsHumanReview', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Req() req: Request, @Query() query: Record<string, string>) {
    const result = LeadFiltersSchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.leadsService.findAll(req.tenantId as string, result.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter lead por ID com mensagens recentes' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.leadsService.findOne(req.tenantId as string, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar lead (gera AuditLog com source=HUMAN, campos editados ficam protegidos de IA)',
  })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const result = UpdateLeadSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    const user = req.user as JwtPayload;
    return this.leadsService.update(
      req.tenantId as string,
      id,
      result.data,
      user.sub,
    );
  }

  @Post(':id/reprocess')
  @ApiOperation({
    summary: 'Reprocessar lead com IA — reseta flags e recoloca na fila',
  })
  @ApiResponse({ status: 201, schema: { properties: { queued: { type: 'boolean' } } } })
  async reprocess(@Req() req: Request, @Param('id') id: string) {
    return this.leadsService.reprocess(req.tenantId as string, id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Histórico completo do lead: AuditLogs + FunnelEvents + AiAnalyses',
  })
  async getHistory(@Req() req: Request, @Param('id') id: string) {
    return this.leadsService.getHistory(req.tenantId as string, id);
  }
}
