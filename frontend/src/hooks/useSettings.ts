import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface AppSettings {
  id: string;
  name: string;
  slug: string;
  aiPrompt: string;
  promptVersion: number;
  requiredFields: string[];
  createdAt: string;
}

export interface UpdateSettingsPayload {
  aiPrompt?: string;
  requiredFields?: string[];
  name?: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<AppSettings>('/settings');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateSettingsPayload) => {
      const { data } = await api.patch<AppSettings>('/settings', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['settings'], data);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
