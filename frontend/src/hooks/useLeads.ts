import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Lead, LeadStatus, PaginatedResponse } from '../types/models';

interface LeadFilters {
  status?: LeadStatus;
  cursor?: string;
  limit?: number;
  needsHumanReview?: boolean;
  search?: string;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.cursor) params.set('cursor', filters.cursor);
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.needsHumanReview !== undefined)
        params.set('needsHumanReview', String(filters.needsHumanReview));
      if (filters.search) params.set('search', filters.search);

      const { data } = await api.get<PaginatedResponse<Lead>>(
        `/leads?${params.toString()}`,
      );
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Lead, 'name' | 'plate' | 'email' | 'status'>> & { disqualifyReason?: string };
    }) => {
      const response = await api.patch<Lead>(`/leads/${id}`, data);
      return response.data;
    },
    onSuccess: (lead) => {
      queryClient.setQueryData(['lead', lead.id], lead);
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useReprocessLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ queued: boolean }>(
        `/leads/${id}/reprocess`,
      );
      return data;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ['lead', id] });
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
