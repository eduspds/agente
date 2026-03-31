import {
  Bot,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import type { AiInsight, Lead } from '../../types/models';
import { cn } from '../../lib/utils';

interface AiInsightPanelProps {
  insight: AiInsight | null;
  lead: Lead | null;
  isLoading: boolean;
  onReprocess: () => void;
  onAdvance: () => void;
}

const INTENT_LABEL: Record<string, string> = {
  NEGOCIACAO: 'Negociação',
  SUPORTE: 'Suporte',
  SOCIAL: 'Social',
};

const INTENT_CLASS: Record<string, string> = {
  NEGOCIACAO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  SUPORTE: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  SOCIAL: 'bg-slate-700 text-slate-300 border-slate-600',
};

const SENTIMENT_COLOR: Record<string, string> = {
  POSITIVO: 'text-emerald-400',
  NEUTRO: 'text-slate-400',
  NEGATIVO: 'text-red-400',
};

function ProgressBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-blue-500 transition-all"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-800', className)}
    />
  );
}

export function AiInsightPanel({
  insight,
  lead,
  isLoading,
  onReprocess,
  onAdvance,
}: AiInsightPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 border-l border-slate-800 bg-slate-900/50">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center border-l border-slate-800 bg-slate-900/50">
        <Bot className="w-8 h-8 text-slate-600" />
        <p className="text-sm text-slate-400">
          Nenhuma análise disponível ainda. As mensagens serão processadas
          automaticamente.
        </p>
        <button
          type="button"
          onClick={onReprocess}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Processar agora
        </button>
      </div>
    );
  }

  const allFieldsFilled =
    Boolean(insight.extractedFields.name) &&
    Boolean(insight.extractedFields.plate) &&
    Boolean(insight.extractedFields.email);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto border-l border-slate-800 bg-slate-900/50">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-slate-200">Análise da IA</span>
        <span className="ml-auto text-xs text-slate-500">
          v{insight.promptVersion}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-slate-800 space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Scores
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-20 shrink-0">Confiança</span>
          <ProgressBar value={insight.confidenceScore * 100} />
          <span className="text-xs font-medium text-slate-300 w-8 text-right">
            {Math.round(insight.confidenceScore * 100)}%
          </span>
        </div>
        {lead?.priorityScore != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20 shrink-0">Prioridade</span>
            <ProgressBar value={(lead.priorityScore ?? 0) * 100} />
            <span className="text-xs font-medium text-slate-300 w-8 text-right">
              {Math.round((lead.priorityScore ?? 0) * 100)}%
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-20 shrink-0">Sentimento</span>
          <span
            className={cn(
              'text-xs font-medium',
              SENTIMENT_COLOR[insight.sentiment],
            )}
          >
            {insight.sentiment === 'POSITIVO'
              ? 'Positivo'
              : insight.sentiment === 'NEUTRO'
                ? 'Neutro'
                : 'Negativo'}
          </span>
        </div>
        {insight.confidenceScore < 0.6 && (
          <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/25">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs text-red-300">Requer revisão humana</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Intenção
        </p>
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            INTENT_CLASS[insight.intent],
          )}
        >
          {INTENT_LABEL[insight.intent] ?? insight.intent}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Campos extraídos
        </p>
        <div className="space-y-1.5">
          {(
            [
              ['Nome', insight.extractedFields.name],
              ['Placa', insight.extractedFields.plate],
              ['E-mail', insight.extractedFields.email],
            ] as [string, string | null][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between items-center gap-2">
              <span className="text-xs text-slate-500">{label}</span>
              {value ? (
                <span className="text-xs font-medium text-slate-200 truncate max-w-[140px]">
                  {value}
                </span>
              ) : (
                <span className="text-xs text-slate-600 italic">não informado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {insight.missingFields.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Pendências
          </p>
          <div className="space-y-1">
            {insight.missingFields.map((f) => (
              <div
                key={f}
                className="flex items-center gap-1.5 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-md"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {allFieldsFilled && insight.missingFields.length === 0 && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Todos os campos obrigatórios preenchidos
          </div>
        </div>
      )}

      {insight.summary ? (
        <div className="px-4 py-3 border-b border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Resumo
          </p>
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/80 rounded-md px-3 py-2.5 border border-slate-800">
            {insight.summary}
          </p>
        </div>
      ) : null}

      <div className="px-4 py-3 space-y-2 mt-auto shrink-0">
        {lead?.status === 'QUALIFICADO' && (
          <button
            type="button"
            onClick={onAdvance}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2 font-medium transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Encaminhar para especialista
          </button>
        )}
        <button
          type="button"
          onClick={onReprocess}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-600 text-slate-200 text-sm py-2 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reprocessar com IA
        </button>
      </div>
    </div>
  );
}
