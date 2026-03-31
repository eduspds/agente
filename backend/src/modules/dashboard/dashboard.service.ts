import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      countsByStatus,
      recentCount,
      needsReviewCount,
      topPriority,
    ] = await Promise.all([
      // Contagem por status
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),

      // Leads com interação nas últimas 24h
      this.prisma.lead.count({
        where: {
          tenantId,
          lastMessageAt: { gte: last24h },
        },
      }),

      // Leads aguardando revisão humana
      this.prisma.lead.count({
        where: { tenantId, needsHumanReview: true },
      }),

      // Top 5 leads por prioridade
      this.prisma.lead.findMany({
        where: {
          tenantId,
          status: {
            notIn: [LeadStatus.DESQUALIFICADO, LeadStatus.PENDENTE_IDENTIFICACAO],
          },
        },
        orderBy: { priorityScore: 'desc' },
        take: 5,
        select: {
          id: true,
          phone: true,
          name: true,
          status: true,
          intent: true,
          sentiment: true,
          priorityScore: true,
          needsHumanReview: true,
          lastMessageAt: true,
        },
      }),
    ]);

    // Organiza contagens por status em objeto
    const statusCounts = Object.values(LeadStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const item of countsByStatus) {
      statusCounts[item.status] = item._count.id;
    }

    const totalActive = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    return {
      totalActive,
      statusCounts,
      recentLeadsCount: recentCount,
      needsHumanReviewCount: needsReviewCount,
      topPriorityLeads: topPriority,
    };
  }
}
