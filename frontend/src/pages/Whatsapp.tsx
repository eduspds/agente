import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import QrCodeDisplay from '@/components/whatsapp/QrCodeDisplay'

export default function WhatsappPage() {
  const connect = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<unknown>('/whatsapp/connect')
      return data
    },
  })

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<unknown>('/whatsapp/disconnect')
      return data
    },
  })

  const statusQuery = useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => {
      const { data } = await api.get<unknown>('/whatsapp/status')
      return data
    },
    enabled: false,
  })

  return (
    <div className="p-8 max-w-lg mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">WhatsApp</h2>
        <p className="text-slate-500 text-sm mt-1">
          Conecte a instância via Evolution API (proxy no backend).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => connect.mutate()}
          disabled={connect.isPending}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm"
        >
          {connect.isPending ? 'Conectando…' : 'Iniciar conexão'}
        </button>
        <button
          type="button"
          onClick={() => void statusQuery.refetch()}
          disabled={statusQuery.isFetching}
          className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800"
        >
          Status
        </button>
        <button
          type="button"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10"
        >
          Desconectar
        </button>
      </div>

      {statusQuery.data !== undefined ? (
        <pre className="text-xs text-slate-500 overflow-auto max-h-40 bg-slate-900 p-3 rounded-lg border border-slate-800">
          {JSON.stringify(statusQuery.data, null, 2)}
        </pre>
      ) : null}

      <QrCodeDisplay />
    </div>
  )
}
