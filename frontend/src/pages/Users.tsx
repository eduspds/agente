import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { UserRow } from '@/types/models'

interface UsersListResponse {
  items: UserRow[]
  nextCursor?: string
}

interface CreateUserResponse {
  user: UserRow
  initialPassword: string
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<UsersListResponse>('/users?take=50')
      return data
    },
  })

  const createUser = useMutation({
    mutationFn: async () => {
      const email = window.prompt('E-mail do novo usuário')
      if (!email) return null
      const name = window.prompt('Nome') ?? 'Agente'
      const { data } = await api.post<CreateUserResponse>('/users', {
        email,
        name,
        role: 'AGENT',
      })
      return data
    },
    onSuccess: (res) => {
      if (!res) return
      setCreatedPassword(res.initialPassword)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.patch(`/users/${id}`, { active })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  if (list.isLoading) {
    return <div className="p-8 text-slate-400">Carregando usuários…</div>
  }

  if (list.error || !list.data) {
    return <div className="p-8 text-red-400">Sem permissão ou erro ao listar usuários.</div>
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuários</h2>
          <p className="text-slate-500 text-sm mt-1">Somente administradores</p>
        </div>
        <button
          type="button"
          onClick={() => createUser.mutate()}
          disabled={createUser.isPending}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
        >
          Novo usuário
        </button>
      </div>

      {createdPassword ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">Senha inicial gerada (copie agora):</p>
          <p className="font-mono mt-2 text-white">{createdPassword}</p>
          <button
            type="button"
            className="mt-3 text-xs text-amber-300 underline"
            onClick={() => setCreatedPassword(null)}
          >
            Ocultar
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Ativo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {list.data.items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 text-white">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-slate-300">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.active ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {u.active ? 'sim' : 'não'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-white"
                    onClick={() =>
                      toggleActive.mutate({ id: u.id, active: !u.active })
                    }
                  >
                    {u.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
