import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_PENDING';

export interface WhatsAppConnection {
  id: string;
  name: string;
  instanceName: string;
  status: ConnectionStatus;
  phone: string | null;
  qrCode: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface CreateConnectionPayload {
  name: string;
  instanceName: string;
}

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const { data } = await api.get<WhatsAppConnection[]>('/connections');
      return data;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateConnectionPayload) => {
      const { data } = await api.post<WhatsAppConnection>(
        '/connections',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/connections/${id}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useReconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<WhatsAppConnection>(
        `/connections/${id}/reconnect`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}
