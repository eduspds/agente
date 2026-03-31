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
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { LeadsService } from './leads.service';
import {
  LeadFiltersSchema,
  UpdateLeadDtoSwagger,
  UpdateLeadSchema,
} from './dto/lead.dto';
import { GetMessagesDtoSchema } from './dto/get-messages.dto';
import { JwtPayload } from '../../common/auth/jwt-payload';

@ApiTags('leads')
@ApiBearerAuth('access-token')
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
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['priority', 'lastMessageAt'],
    description: 'Ordenação (padrão: priority)',
  })
  async findAll(@Query() query: Record<string, string>) {
    const result = LeadFiltersSchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.leadsService.findAll(result.data);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lista mensagens paginadas de um lead (cursor-based + última análise IA)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'ID da mensagem âncora (bloco anterior no tempo)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @Param('id') id: string,
    @Query() rawQuery: Record<string, string | string[] | undefined>,
  ) {
    const q: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawQuery)) {
      if (typeof v === 'string') q[k] = v;
      else if (Array.isArray(v) && v[0] !== undefined) q[k] = v[0];
    }
    const result = GetMessagesDtoSchema.safeParse(q);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.leadsService.getMessages(id, result.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter lead por ID com mensagens recentes' })
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
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
    return this.leadsService.update(id, result.data, user.sub);
  }

  @Post(':id/reprocess')
  @ApiOperation({
    summary: 'Reprocessar lead com IA — reseta flags e recoloca na fila',
  })
  @ApiResponse({ status: 201, schema: { properties: { queued: { type: 'boolean' } } } })
  async reprocess(@Param('id') id: string) {
    return this.leadsService.reprocess(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Histórico completo do lead: AuditLogs + FunnelEvents + AiAnalyses',
  })
  async getHistory(@Param('id') id: string) {
    return this.leadsService.getHistory(id);
  }
}
