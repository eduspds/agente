import { Bot } from 'lucide-react';
import type { AiAnalysis } from '../../types/models';
import { formatDate } from '../../lib/utils';

interface AiExtractionPanelProps {
  analyses: AiAnalysis[];
}

export function AiExtractionPanel({ analyses }: AiExtractionPanelProps) {
  const latest = analyses[0];
  if (!latest) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Bot className="w-4 h-4 text-blue-400" />
        Extração de Dados — IA
      </h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {Object.entries(
          latest.extractedFields as Record<string, string | null>,
        ).map(([field, value]) => (
          <div key={field}>
            <p className="text-slate-400 text-xs capitalize">{field}</p>
            <p className="text-white font-medium mt-0.5">
              {value ?? <span className="text-slate-500 italic">—</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
        <span>Versão do prompt: v{latest.promptVersion}</span>
        <span>{formatDate(latest.createdAt)}</span>
      </div>
    </div>
  );
}
