import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const grouped = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    })

    const byStatus: Record<string, number> = {
      NOVO: 0,
      EM_QUALIFICACAO: 0,
      QUALIFICADO: 0,
      DESQUALIFICADO: 0,
      ESPECIALISTA: 0,
    }
    for (const row of grouped) {
      byStatus[row.status] = row._count.id
    }

    const totalLeads = await this.prisma.lead.count({ where: { tenantId } })
    const messages24h = await this.prisma.message.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
    })

    const recent = await this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
      select: {
        id: true,
        chatId: true,
        phone: true,
        name: true,
        status: true,
        lastMessageAt: true,
        needsHumanReview: true,
      },
    })

    return {
      totalLeads,
      byStatus,
      messages24h,
      recent,
    }
  }
}
