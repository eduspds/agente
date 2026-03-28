import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Lead } from '@/types/models'

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: Boolean(id),
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await api.get<Lead>(`/leads/${id as string}`)
      return data
    },
  })
}
