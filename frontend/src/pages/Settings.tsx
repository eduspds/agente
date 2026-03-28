import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface TenantMe {
  id: string
  name: string
  slug: string
  aiModel: string
  aiApiKeyMasked: string
  aiBaseUrl: string
  aiTimeoutMs: number
  aiConfidThreshold: number
  aiPrompt: string
  requiredFields: string[]
  specialistName: string | null
  specialistContact: string | null
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'general' | 'ai' | 'funnel'>('general')

  const me = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: async () => {
      const { data } = await api.get<TenantMe>('/tenants/me')
      return data
    },
  })

  const patchGeneral = useMutation({
    mutationFn: async (body: Record<string, string | null>) => {
      const { data } = await api.patch<TenantMe>('/tenants/me/general', body)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })
    },
  })

  const patchAi = useMutation({
    mutationFn: async (body: Record<string, string | number>) => {
      const { data } = await api.patch<TenantMe>('/tenants/me/ai', body)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })
    },
  })

  const patchFunnel = useMutation({
    mutationFn: async (body: { requiredFields: string[] }) => {
      const { data } = await api.patch<TenantMe>('/tenants/me/funnel', body)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })
    },
  })

  if (me.isLoading || !me.data) {
    return <div className="p-8 text-slate-400">Carregando configurações…</div>
  }

  const t = me.data

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Configurações</h2>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['general', 'ai', 'funnel'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
              tab === k
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {k === 'general' ? 'Geral' : k === 'ai' ? 'IA' : 'Funil'}
          </button>
        ))}
      </div>

      {tab === 'general' ? (
        <form
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            patchGeneral.mutate({
              name: String(fd.get('name') ?? ''),
              specialistName: String(fd.get('specialistName') || '') || null,
              specialistContact: String(fd.get('specialistContact') || '') || null,
            })
          }}
        >
          <label className="block text-sm text-slate-300">
            Nome do tenant
            <input
              name="name"
              defaultValue={t.name}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Especialista
            <input
              name="specialistName"
              defaultValue={t.specialistName ?? ''}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Contato do especialista
            <input
              name="specialistContact"
              defaultValue={t.specialistContact ?? ''}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <button
            type="submit"
            disabled={patchGeneral.isPending}
            className="px-4 py-2 bg-emerald-600 rounded-lg text-sm text-white"
          >
            Salvar
          </button>
        </form>
      ) : null}

      {tab === 'ai' ? (
        <form
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const key = String(fd.get('aiApiKey') ?? '').trim()
            const body: Record<string, string | number> = {
              aiModel: String(fd.get('aiModel') ?? ''),
              aiBaseUrl: String(fd.get('aiBaseUrl') ?? ''),
              aiTimeoutMs: Number(fd.get('aiTimeoutMs') ?? 30000),
              aiConfidThreshold: Number(fd.get('aiConfidThreshold') ?? 0.6),
              aiPrompt: String(fd.get('aiPrompt') ?? ''),
            }
            if (key.length > 0) body.aiApiKey = key
            patchAi.mutate(body)
          }}
        >
          <p className="text-xs text-slate-500">
            Chave atual (mascarada): {t.aiApiKeyMasked}
          </p>
          <label className="block text-sm text-slate-300">
            Nova API Key (opcional)
            <input
              name="aiApiKey"
              type="password"
              placeholder="Deixe vazio para manter"
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Modelo
            <input
              name="aiModel"
              defaultValue={t.aiModel}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Base URL
            <input
              name="aiBaseUrl"
              defaultValue={t.aiBaseUrl}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Timeout (ms)
            <input
              name="aiTimeoutMs"
              type="number"
              defaultValue={t.aiTimeoutMs}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Limiar de confiança (0–1)
            <input
              name="aiConfidThreshold"
              type="number"
              step="0.05"
              defaultValue={t.aiConfidThreshold}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Prompt
            <textarea
              name="aiPrompt"
              rows={8}
              defaultValue={t.aiPrompt}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg font-mono text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={patchAi.isPending}
            className="px-4 py-2 bg-emerald-600 rounded-lg text-sm text-white"
          >
            Salvar IA
          </button>
        </form>
      ) : null}

      {tab === 'funnel' ? (
        <form
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const raw = String(fd.get('requiredFields') ?? '')
            const requiredFields = raw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            patchFunnel.mutate({ requiredFields })
          }}
        >
          <label className="block text-sm text-slate-300">
            Campos obrigatórios (vírgula)
            <input
              name="requiredFields"
              defaultValue={t.requiredFields.join(', ')}
              className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
            />
          </label>
          <button
            type="submit"
            disabled={patchFunnel.isPending}
            className="px-4 py-2 bg-emerald-600 rounded-lg text-sm text-white"
          >
            Salvar funil
          </button>
        </form>
      ) : null}
    </div>
  )
}
