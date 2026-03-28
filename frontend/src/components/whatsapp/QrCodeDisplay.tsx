import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface QrPayload {
  base64?: string
  qrcode?: { base64?: string }
  pairingCode?: string
}

function extractBase64(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as QrPayload
  if (typeof o.base64 === 'string' && o.base64.length > 0) return o.base64
  if (o.qrcode && typeof o.qrcode.base64 === 'string') return o.qrcode.base64
  return null
}

export default function QrCodeDisplay() {
  const [secondsLeft, setSecondsLeft] = useState(30)

  const q = useQuery({
    queryKey: ['whatsapp', 'qrcode'],
    queryFn: async () => {
      const { data } = await api.get<unknown>('/whatsapp/qrcode')
      return data
    },
    refetchInterval: secondsLeft > 0 ? 1000 : false,
  })

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [secondsLeft])

  const b64 = extractBase64(q.data)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 max-w-md mx-auto text-center">
      <p className="text-sm text-slate-400 mb-2">
        Atualizando QR automaticamente — próxima em{' '}
        <span className="text-emerald-400 font-mono tabular-nums">{secondsLeft}s</span>
      </p>
      {q.isFetching ? (
        <p className="text-slate-500 text-sm py-12">Buscando QR…</p>
      ) : b64 ? (
        <img
          src={b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`}
          alt="QR Code WhatsApp"
          className="mx-auto rounded-lg border border-slate-700 max-w-full"
        />
      ) : (
        <p className="text-amber-500 text-sm py-8">
          Não foi possível obter o QR. Verifique a Evolution API e a instância.
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          setSecondsLeft(30)
          void q.refetch()
        }}
        className="mt-4 text-sm text-emerald-400 hover:text-emerald-300"
      >
        Renovar contagem e atualizar agora
      </button>
    </div>
  )
}
