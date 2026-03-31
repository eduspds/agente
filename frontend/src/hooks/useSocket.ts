import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';
import type { Lead } from '../types/models';

export function useSocket() {
  const queryClient = useQueryClient();

  const handleLeadUpdated = useCallback(
    (lead: Lead) => {
      // Atualiza cache do lead específico
      queryClient.setQueryData(['lead', lead.id], (old: Lead | undefined) =>
        old ? { ...old, ...lead } : lead,
      );
      // Invalida lista de leads para refetch
      void queryClient.invalidateQueries({
        queryKey: ['leads'],
        refetchType: 'active',
      });
      // Invalida stats do dashboard
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
    const socket = getSocket();

    socket.on('lead:updated', handleLeadUpdated);
    socket.on('lead:created', handleLeadCreated);

    return () => {
      socket.off('lead:updated', handleLeadUpdated);
      socket.off('lead:created', handleLeadCreated);
    };
  }, [handleLeadUpdated, handleLeadCreated]);
}
