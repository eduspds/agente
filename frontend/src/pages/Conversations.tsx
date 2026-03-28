import { Link } from 'react-router-dom'
import { useConversations } from '@/hooks/useConversations'

export default function ConversationsPage() {
  const { data, isLoading, error } = useConversations()

  if (isLoading) {
    return <div className="p-8 text-slate-400">Carregando conversas…</div>
  }

  if (error || !data) {
    return (
      <div className="p-8 text-red-400">Não foi possível carregar as conversas.</div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-white mb-2">Conversas</h2>
      <p className="text-slate-500 text-sm mb-6">Selecione um lead para ver as mensagens.</p>
      <ul className="space-y-2">
        {data.map((c) => {
          const preview = c.messages[0]?.body ?? 'Sem mensagens'
          return (
            <li key={c.id}>
              <Link
                to={`/conversations/${c.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-white">{c.name ?? c.phone}</p>
                  <span className="text-xs text-slate-500 shrink-0">{c.status}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{preview}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
