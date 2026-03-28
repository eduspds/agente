import { useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Lead, LeadStatus } from '@/types/models'
import LeadCard from '@/components/kanban/LeadCard'
import { useLeads } from '@/hooks/useLeads'

const COLUMNS: { id: LeadStatus; title: string }[] = [
  { id: 'NOVO', title: 'Novo' },
  { id: 'EM_QUALIFICACAO', title: 'Em qualificação' },
  { id: 'QUALIFICADO', title: 'Qualificado' },
  { id: 'ESPECIALISTA', title: 'Especialista' },
  { id: 'DESQUALIFICADO', title: 'Desqualificado' },
]

function Column({
  status,
  title,
  leads,
}: {
  status: LeadStatus
  title: string
  leads: Lead[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex-1 min-w-[220px] flex flex-col">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
        {title}
        <span className="ml-2 text-slate-600">({leads.length})</span>
      </h3>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border border-dashed p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/50'
        }`}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  )
}

export default function KanbanBoard() {
  const queryClient = useQueryClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const qNovo = useLeads({ status: 'NOVO' })
  const qEm = useLeads({ status: 'EM_QUALIFICACAO' })
  const qQual = useLeads({ status: 'QUALIFICADO' })
  const qEsp = useLeads({ status: 'ESPECIALISTA' })
  const qDes = useLeads({ status: 'DESQUALIFICADO' })

  const byStatus = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      NOVO: qNovo.data?.items ?? [],
      EM_QUALIFICACAO: qEm.data?.items ?? [],
      QUALIFICADO: qQual.data?.items ?? [],
      ESPECIALISTA: qEsp.data?.items ?? [],
      DESQUALIFICADO: qDes.data?.items ?? [],
    }
    return map
  }, [qNovo.data, qEm.data, qQual.data, qEsp.data, qDes.data])

  const patchStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      await api.patch(`/leads/${id}`, { status })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as LeadStatus
    const lead = active.data.current?.lead as Lead | undefined
    if (!lead || lead.status === newStatus) return
    patchStatus.mutate({ id: lead.id, status: newStatus })
  }

  const loading =
    qNovo.isLoading ||
    qEm.isLoading ||
    qQual.isLoading ||
    qEsp.isLoading ||
    qDes.isLoading

  if (loading) {
    return (
      <div className="p-8 text-slate-400 text-center">Carregando quadro…</div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            title={col.title}
            leads={byStatus[col.id]}
          />
        ))}
      </div>
    </DndContext>
  )
}
