import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ConversationRow, ConversationDetail } from '@/types/models'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await api.get<ConversationRow[]>('/conversations')
      return data
    },
  })
}

export function useConversationDetail(leadId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', leadId],
    enabled: Boolean(leadId),
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await api.get<ConversationDetail>(`/conversations/${leadId as string}`)
      return data
    },
  })
}
