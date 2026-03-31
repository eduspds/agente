import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MessagesResponse } from '@/types';

export function useLeadMessages(leadId: string | null) {
  return useInfiniteQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam as string);
      const { data } = await api.get<MessagesResponse>(
        `/leads/${leadId}/messages?${params.toString()}`,
      );
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(leadId),
    staleTime: 30_000,
  });
}
