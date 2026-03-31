import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { LeadHistory, LeadWithMessages } from '../types/models';

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data } = await api.get<LeadWithMessages>(`/leads/${id}`);
      return data;
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useLeadHistory(id: string) {
  return useQuery({
    queryKey: ['lead-history', id],
    queryFn: async () => {
      const { data } = await api.get<LeadHistory>(`/leads/${id}/history`);
      return data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
