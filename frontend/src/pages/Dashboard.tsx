import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DashboardStats } from '@/types/models'

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'stats'],
    staleTime: 30000,
    queryFn: async () => {
      const { data: res } = await api.get<DashboardStats>('/dashboard/stats')
      return res
    },
  })

  if (isLoading) {
    return (
      <div className="p-8 text-slate-400">Carregando métricas…</div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 text-red-400">Não foi possível carregar o dashboard.</div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Visão geral do funil e atividade</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Total de leads</p>
          <p className="text-3xl font-semibold text-white mt-2">{data.totalLeads}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Mensagens (24h)</p>
          <p className="text-3xl font-semibold text-emerald-400 mt-2">{data.messages24h}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <p className="text-emerald-600/80 text-xs uppercase tracking-wide">Qualificados</p>
          <p className="text-3xl font-semibold text-emerald-400 mt-2">
            {data.byStatus.QUALIFICADO ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-amber-600/80 text-xs uppercase tracking-wide">Em qualificação</p>
          <p className="text-3xl font-semibold text-amber-400 mt-2">
            {data.byStatus.EM_QUALIFICACAO ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">Leads recentes</h3>
        </div>
        <ul className="divide-y divide-slate-800">
          {data.recent.map((l) => (
            <li key={l.id} className="px-5 py-3 flex justify-between items-center gap-4">
              <div>
                <p className="text-white text-sm font-medium">{l.name ?? l.phone}</p>
                <p className="text-slate-500 text-xs">{l.phone}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">
                {l.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
