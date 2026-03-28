import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { LeadStatus, LeadsListResponse } from '@/types/models'

interface LeadFilters {
  status?: LeadStatus
  cursor?: string
  take?: number
}

export function useLeads(filters: LeadFilters = {}) {
  const { status, cursor, take = 50 } = filters

  return useQuery({
    queryKey: ['leads', status ?? 'all', cursor ?? 'start'],
    staleTime: 30000,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('take', String(Math.min(take, 50)))
      if (status) params.set('status', status)
      if (cursor) params.set('cursor', cursor)
      const { data } = await api.get<LeadsListResponse>(`/leads?${params.toString()}`)
      return data
    },
  })
}
