import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Lead } from '@/types/models'

function isRecent(iso: string | null): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < 86400000
}

export default function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:border-slate-600 transition-colors"
    >
      <div className="flex flex-wrap gap-1.5 mb-2">
        {isRecent(lead.lastMessageAt) ? (
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            Recente
          </span>
        ) : null}
        {lead.needsHumanReview ? (
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Revisar
          </span>
        ) : null}
      </div>
      <p className="font-medium text-white text-sm">{lead.name ?? lead.phone}</p>
      <p className="text-xs text-slate-500 mt-1 truncate">{lead.phone}</p>
      {lead.plate ? (
        <p className="text-xs text-slate-400 mt-1 font-mono">{lead.plate}</p>
      ) : null}
    </div>
  )
}
