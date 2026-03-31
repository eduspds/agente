import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_PENDING';

export interface WhatsAppSession {
  id: string;
  name: string;
  instanceName: string;
  status: ConnectionStatus;
  phone: string | null;
  qrCode: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface ConfigureWhatsAppSessionPayload {
  name?: string;
  instanceName?: string;
}

export function useWhatsAppSession() {
  return useQuery({
    queryKey: ['whatsapp', 'session'],
    queryFn: async () => {
      const { data } = await api.get<WhatsAppSession>('/whatsapp/session');
      return data;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useConfigureWhatsAppSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ConfigureWhatsAppSessionPayload) => {
      const { data } = await api.post<WhatsAppSession>(
        '/whatsapp/session',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'session'] });
    },
  });
}

export function useResetWhatsAppSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<WhatsAppSession>('/whatsapp/session');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'session'] });
    },
  });
}

export function useReconnectWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<WhatsAppSession>('/whatsapp/reconnect');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['whatsapp', 'session'] });
    },
  });
}

export function useSendWhatsAppMessage() {
  return useMutation({
    mutationFn: async (payload: { to: string; text: string }) => {
      const { data } = await api.post<{ ok: boolean }>(
        '/whatsapp/send',
        payload,
      );
      return data;
    },
  });
}
