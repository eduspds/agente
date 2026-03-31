import type { Lead, LeadStatus } from '../../types/models';
import { LeadCard } from './LeadCard';
import { STATUS_LABELS, STATUS_COLORS } from '../../lib/utils';
import { cn } from '../../lib/utils';

const KANBAN_COLUMNS: LeadStatus[] = [
  'NOVO',
  'EM_QUALIFICACAO',
  'QUALIFICADO',
  'ESPECIALISTA',
  'DESQUALIFICADO',
];

interface KanbanBoardProps {
  leads: Lead[];
  isLoading?: boolean;
}

export function KanbanBoard({ leads, isLoading }: KanbanBoardProps) {
  const columnLeads = (status: LeadStatus) =>
    leads.filter((l) => l.status === status);

  if (isLoading) {
    return (
      <div className="flex gap-4 p-6 overflow-x-auto">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col}
            className="flex-shrink-0 w-72 bg-slate-900 border border-slate-800 rounded-xl h-[600px] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-6 overflow-x-auto h-full">
      {KANBAN_COLUMNS.map((status) => {
        const items = columnLeads(status);
        return (
          <div
            key={status}
            className="flex-shrink-0 w-72 flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <span
                className={cn(
                  'px-2 py-1 rounded text-xs font-semibold border',
                  STATUS_COLORS[status],
                )}
              >
                {STATUS_LABELS[status]}
              </span>
              <span className="text-slate-500 text-xs font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-sm">
                  Sem leads
                </div>
              ) : (
                items.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
