import { useState } from 'react';
import { Search, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { useLeads } from '../hooks/useLeads';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { LeadCard } from '../components/kanban/LeadCard';
import type { LeadStatus } from '../types/models';
import { STATUS_LABELS, STATUS_COLORS, cn } from '../lib/utils';

const STATUS_FILTERS: { label: string; value: LeadStatus | '' }[] = [
  { label: 'Todos', value: '' },
  { label: 'Novos', value: 'NOVO' },
  { label: 'Em Qualificação', value: 'EM_QUALIFICACAO' },
  { label: 'Qualificados', value: 'QUALIFICADO' },
  { label: 'Desqualificados', value: 'DESQUALIFICADO' },
];

export function Leads() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);

  const { data, isLoading, refetch, isFetching } = useLeads({
    status: statusFilter || undefined,
    search: search || undefined,
    needsHumanReview: reviewOnly || undefined,
    limit: 50,
  });

  const leads = data?.data ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Leads</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data?.pagination?.total ?? 0} leads encontrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-2 rounded-lg transition-all',
                view === 'kanban'
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-2 rounded-lg transition-all',
                view === 'list'
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, placa..."
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() =>
                  setStatusFilter(filter.value as LeadStatus | '')
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  statusFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setReviewOnly(!reviewOnly)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              reviewOnly
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white',
            )}
          >
            ⚠ Revisar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <KanbanBoard leads={leads} isLoading={isLoading} />
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto h-full">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 border border-slate-700 rounded-lg h-40 animate-pulse"
                  />
                ))
              : leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
          </div>
        )}
      </div>
    </div>
  );
}
