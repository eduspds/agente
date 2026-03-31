import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import type { Lead } from '@/types';

/** Listeners globais (dashboard, cache de leads). */
export function useSocket(): void;
/** Subscrição pontual (ex.: página de mensageria). */
export function useSocket(
  event: 'lead:updated',
  handler: (lead: Lead) => void,
): void;
export function useSocket(
  event?: 'lead:updated',
  handler?: (lead: Lead) => void,
): void {
  const queryClient = useQueryClient();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const handleLeadUpdated = useCallback(
    (lead: Lead) => {
      queryClient.setQueryData(['lead', lead.id], (old: Lead | undefined) =>
        old ? { ...old, ...lead } : lead,
      );
      void queryClient.invalidateQueries({
        queryKey: ['leads'],
        refetchType: 'active',
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    [queryClient],
  );

  const handleLeadCreated = useCallback(
    (_lead: Lead) => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (event === 'lead:updated') {
      const socket = getSocket();
      const fn = (lead: Lead) => handlerRef.current?.(lead);
      socket.on('lead:updated', fn);
      return () => {
        socket.off('lead:updated', fn);
      };
    }

    const socket = getSocket();
    socket.on('lead:updated', handleLeadUpdated);
    socket.on('lead:created', handleLeadCreated);
    return () => {
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('lead:created', handleLeadCreated);
    };
  }, [event, handleLeadUpdated, handleLeadCreated]);
}
