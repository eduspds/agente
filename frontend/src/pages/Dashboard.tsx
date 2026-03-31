import { useQuery } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardStats } from '../types/models';
import { STATUS_LABELS, STATUS_COLORS, cn, formatPhone, timeAgo } from '../lib/utils';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  accent?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-sm font-medium">{title}</span>
        <div className={cn('p-2 rounded-lg', accent ?? 'bg-slate-800')}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {description && (
        <p className="text-slate-400 text-xs mt-1">{description}</p>
      )}
    </div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/dashboard/stats');
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Visão geral em tempo real da plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Leads"
          value={stats?.totalActive ?? 0}
          icon={Users}
          description="Todos os status"
          accent="bg-blue-600/30"
        />
        <StatCard
          title="Leads Recentes"
          value={stats?.recentLeadsCount ?? 0}
          icon={Clock}
          description="Últimas 24 horas"
          accent="bg-emerald-600/30"
        />
        <StatCard
          title="Aguardando Revisão"
          value={stats?.needsHumanReviewCount ?? 0}
          icon={AlertTriangle}
          description="Confiança baixa"
          accent="bg-red-600/30"
        />
        <StatCard
          title="Qualificados"
          value={stats?.statusCounts?.QUALIFICADO ?? 0}
          icon={TrendingUp}
          description="Prontos para especialista"
          accent="bg-violet-600/30"
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Distribuição por Status
          </h3>
          <div className="space-y-3">
            {stats &&
              Object.entries(stats.statusCounts)
                .filter(([status]) => status !== 'PENDENTE_IDENTIFICACAO')
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium border w-36 text-center',
                        STATUS_COLORS[status as keyof typeof STATUS_COLORS],
                      )}
                    >
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{
                          width: `${stats.totalActive > 0 ? (count / stats.totalActive) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm font-medium w-6 text-right">
                      {count}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Top Priority */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">
            Top 5 — Alta Prioridade
          </h3>
          <div className="space-y-3">
            {stats?.topPriorityLeads?.length === 0 && (
              <p className="text-slate-500 text-sm">
                Nenhum lead qualificado ainda
              </p>
            )}
            {stats?.topPriorityLeads?.map((lead, i) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"
              >
                <span className="text-slate-500 text-sm font-bold w-4">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {lead.name ?? formatPhone(lead.phone ?? null)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead.status && (
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded border',
                          STATUS_COLORS[lead.status],
                        )}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    )}
                    <span className="text-slate-500 text-xs">
                      {timeAgo(lead.lastMessageAt ?? null)}
                    </span>
                  </div>
                </div>
                {lead.priorityScore !== null && lead.priorityScore !== undefined && (
                  <span className="text-emerald-400 text-sm font-bold">
                    {Math.round(lead.priorityScore * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
