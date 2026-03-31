import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
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
  async getStats() {
    return this.dashboardService.getStats();
  }
}

@ApiTags('debug')
@ApiBearerAuth('access-token')
@Controller('debug')
export class DebugController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('leads/:id/ai-payload')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Inspecionar último AiAnalysis de um lead (apenas ADMIN)',
    description: 'Retorna prompt enviado, resposta bruta e resultado parseado',
  })
  async getAiPayload(@Param('id') id: string) {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      where: { leadId: id },
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
