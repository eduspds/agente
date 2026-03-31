import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      countsByStatus,
      recentCount,
      needsReviewCount,
      topPriority,
    ] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      this.prisma.lead.count({
        where: {
          lastMessageAt: { gte: last24h },
        },
      }),

      this.prisma.lead.count({
        where: { needsHumanReview: true },
      }),

      this.prisma.lead.findMany({
        where: {
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
      needsReviewCount,
      topPriority,
    };
  }
}
