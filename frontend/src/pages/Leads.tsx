import KanbanBoard from '@/components/kanban/KanbanBoard'

export default function LeadsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Leads</h2>
        <p className="text-slate-500 text-sm mt-1">
          Arraste os cards entre colunas para atualizar o status. Atualizações em tempo real via
          WebSocket.
        </p>
      </div>
      <KanbanBoard />
    </div>
  )
}
