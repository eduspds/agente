import { Check, X } from 'lucide-react'

export default function AiExtractionPanel({
  name,
  plate,
  email,
}: {
  name: string | null | undefined
  plate: string | null | undefined
  email: string | null | undefined
}) {
  const Row = ({
    label,
    value,
  }: {
    label: string
    value: string | null | undefined
  }) => {
    const ok = Boolean(value && String(value).trim().length > 0)
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="flex items-center gap-2 text-sm text-white">
          {ok ? (
            <Check className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
          ) : (
            <X className="w-4 h-4 text-red-500 shrink-0" aria-hidden />
          )}
          <span className="truncate max-w-[180px]">{ok ? value : '—'}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Campos (IA)</h3>
      <Row label="Nome" value={name} />
      <Row label="Placa" value={plate} />
      <Row label="E-mail" value={email} />
    </div>
  )
}
