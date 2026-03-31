import { Controller, Get, Param, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Estatísticas do dashboard: contagens por status, leads recentes, top prioridade',
  })
  @ApiResponse({ status: 200 })
  async getStats(@Req() req: Request) {
    return this.dashboardService.getStats(req.tenantId as string);
  }
}

// ─── Debug Controller (apenas ADMIN) ─────────────────────────────────────────

@ApiTags('debug')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('debug')
export class DebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('leads/:id/ai-payload')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Inspecionar último AiAnalysis de um lead (apenas ADMIN)',
    description: 'Retorna prompt enviado, resposta bruta e resultado parseado',
  })
  async getAiPayload(@Req() req: Request, @Param('id') id: string) {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      where: { tenantId: req.tenantId as string, leadId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      return { message: 'Nenhuma análise encontrada para este lead' };
    }

    return {
      id: analysis.id,
      promptSent: analysis.promptSent,
      rawResponse: analysis.rawResponse,
      parsedResult: analysis.parsedResult,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      confidenceScore: analysis.confidenceScore,
      extractedFields: analysis.extractedFields,
      promptVersion: analysis.promptVersion,
      cacheHit: analysis.cacheHit,
      tokensUsed: analysis.tokensUsed,
      latencyMs: analysis.latencyMs,
      createdAt: analysis.createdAt,
    };
  }
}
