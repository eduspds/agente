import { Link, useParams } from 'react-router-dom'
import { useConversationDetail } from '@/hooks/useConversations'
import ConversationMessages from '@/components/conversations/ConversationMessages'
import AiExtractionPanel from '@/components/ai/AiExtractionPanel'

export default function ConversationDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const { data, isLoading, error } = useConversationDetail(leadId)

  if (isLoading) {
    return <div className="p-8 text-slate-400">Carregando conversa…</div>
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <p className="text-red-400">Conversa não encontrada.</p>
        <Link to="/conversations" className="text-emerald-400 text-sm mt-4 inline-block">
          ← Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/conversations" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Conversas
          </Link>
          <h2 className="text-xl font-bold text-white mt-2">
            {data.lead.name ?? data.lead.phone}
          </h2>
          <p className="text-slate-500 text-sm">{data.lead.phone}</p>
        </div>
        <AiExtractionPanel
          name={data.lead.name}
          plate={data.lead.plate}
          email={data.lead.email}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 min-h-[320px]">
        <ConversationMessages messages={data.messages} />
      </div>
    </div>
  )
}
