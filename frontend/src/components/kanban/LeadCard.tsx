import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Phone, Car } from 'lucide-react';
import type { Lead } from '../../types/models';
import {
  cn,
  formatPhone,
  isRecent,
  timeAgo,
  SENTIMENT_COLORS,
  SENTIMENT_ICONS,
} from '../../lib/utils';

interface LeadCardProps {
  lead: Lead;
}

export function LeadCard({ lead }: LeadCardProps) {
  const navigate = useNavigate();
  const recent = isRecent(lead.lastMessageAt);

  return (
    <div
      onClick={() => navigate(`/leads/${lead.id}`)}
      className={cn(
        'bg-slate-800 border rounded-lg p-4 cursor-pointer hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50',
        lead.needsHumanReview
          ? 'border-red-500/40'
          : 'border-slate-700',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {lead.name ?? 'Sem nome'}
          </p>
          {lead.phone && (
            <div className="flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <p className="text-xs text-slate-400">{formatPhone(lead.phone)}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
          {recent && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Recente
            </span>
          )}
          {lead.needsHumanReview && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/30 flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              Revisar
            </span>
          )}
        </div>
      </div>

      {/* Placa */}
      {lead.plate && (
        <div className="flex items-center gap-1.5 mb-2">
          <Car className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-mono text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
            {lead.plate}
          </span>
        </div>
      )}

      {/* Summary */}
      {lead.summary && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
          {lead.summary}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
        <div className="flex items-center gap-2">
          {lead.sentiment && (
            <span
              className={cn(
                'text-xs font-medium',
                SENTIMENT_COLORS[lead.sentiment],
              )}
            >
              {SENTIMENT_ICONS[lead.sentiment]} {lead.sentiment}
            </span>
          )}
          {lead.confidenceScore !== null && (
            <span className="text-xs text-slate-500">
              {Math.round(lead.confidenceScore * 100)}%
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {timeAgo(lead.lastMessageAt)}
        </span>
      </div>

      {/* Priority bar */}
      {lead.priorityScore !== null && (
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              lead.priorityScore >= 0.7
                ? 'bg-emerald-500'
                : lead.priorityScore >= 0.4
                  ? 'bg-amber-500'
                  : 'bg-slate-500',
            )}
            style={{ width: `${lead.priorityScore * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
