import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PaginatedResponse, Lead } from '../types/models';

export function useConversations(filters: { status?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      const { data } = await api.get<PaginatedResponse<Lead>>(
        `/leads?${params.toString()}`,
      );
      return data;
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}
