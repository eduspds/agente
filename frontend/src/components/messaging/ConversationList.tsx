import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search } from 'lucide-react';
import type { Lead } from '@/types';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelect: (lead: Lead) => void;
  isLoading: boolean;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  NOVO: {
    label: 'Novo',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  EM_QUALIFICACAO: {
    label: 'Qualificando',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  QUALIFICADO: {
    label: 'Qualificado',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  DESQUALIFICADO: {
    label: 'Desqualificado',
    className: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  ESPECIALISTA: {
    label: 'Especialista',
    className: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  PENDENTE_IDENTIFICACAO: {
    label: 'Pendente',
    className: 'bg-slate-600/40 text-slate-300 border-slate-500/40',
  },
};

function isRecent(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

export function ConversationList({
  leads,
  selectedLeadId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filtered = leads.filter((lead) => {
    const q = search.toLowerCase();
    return (
      (lead.phone?.toLowerCase().includes(q) ?? false) ||
      (lead.name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-slate-800 bg-slate-900/30">
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Atendimentos</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          <input
            placeholder="Buscar por nome ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 h-8 text-xs rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-slate-800 animate-pulse"
              >
                <div className="h-3 bg-slate-800 rounded w-24 mb-2" />
                <div className="h-2.5 bg-slate-800/60 rounded w-40" />
              </div>
            ))
          : filtered.map((lead) => {
              const badge =
                STATUS_BADGE[lead.status] ?? STATUS_BADGE.NOVO;
              const recent = isRecent(lead.lastMessageAt ?? null);
              const needsReview = lead.needsHumanReview;
              const timeAgo = lead.lastMessageAt
                ? formatDistanceToNow(new Date(lead.lastMessageAt), {
                    addSuffix: false,
                    locale: ptBR,
                  })
                : '';

              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelect(lead)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-slate-800 transition-colors hover:bg-slate-800/50',
                    selectedLeadId === lead.id &&
                      'bg-blue-500/10 border-l-2 border-l-blue-500',
                  )}
                >
                  <div className="flex justify-between items-start mb-0.5 gap-2">
                    <span className="text-sm font-medium text-slate-100 truncate max-w-[150px]">
                      {lead.name ?? lead.phone ?? '—'}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-1.5">
                    {lead.phone ?? '—'}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    <span
                      className={cn(
                        'text-[10px] border rounded px-1.5 py-0 font-medium',
                        badge.className,
                      )}
                    >
                      {badge.label}
                    </span>
                    {recent && (
                      <span className="text-[10px] border rounded px-1.5 py-0 bg-amber-500/15 text-amber-300 border-amber-500/30">
                        Recente
                      </span>
                    )}
                    {needsReview && (
                      <span className="text-[10px] border rounded px-1.5 py-0 bg-red-500/15 text-red-300 border-red-500/30">
                        Revisar
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

        {!isLoading && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            Nenhum atendimento encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
