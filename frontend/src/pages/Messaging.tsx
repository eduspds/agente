import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLeads, useReprocessLead } from '@/hooks/useLeads';
import { useLeadMessages } from '@/hooks/useLeadMessages';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/api';
import { formatApiError } from '@/lib/utils';
import { ConversationList } from '@/components/messaging/ConversationList';
import { MessageThread } from '@/components/messaging/MessageThread';
import { AiInsightPanel } from '@/components/messaging/AiInsightPanel';
import type { Lead } from '@/types';

export function Messaging() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { data: leadsData, isLoading: leadsLoading, isError: leadsError, error: leadsListError } =
    useLeads({
      limit: 50,
      orderBy: 'lastMessageAt',
    });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError: messagesError,
    error: messagesFetchError,
  } = useLeadMessages(selectedLead?.id ?? null);

  const messages =
    [...(messagesData?.pages ?? [])].reverse().flatMap((p) => p.data) ?? [];
  const latestAnalysis = messagesData?.pages[0]?.latestAnalysis ?? null;

  const onLeadSocket = useCallback(
    (updated: Lead) => {
      setSelectedLead((prev) =>
        prev && prev.id === updated.id ? { ...prev, ...updated } : prev,
      );
      void queryClient.invalidateQueries({
        queryKey: ['lead-messages', updated.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    [queryClient],
  );

  useSocket('lead:updated', onLeadSocket);

  useEffect(() => {
    if (!leadsError || !leadsListError) return;
    const { message } = formatApiError(leadsListError);
    toast.error(message, { id: 'messaging-leads-error' });
  }, [leadsError, leadsListError]);

  useEffect(() => {
    if (!messagesError || !messagesFetchError) return;
    const { message } = formatApiError(messagesFetchError);
    toast.error(message, { id: 'lead-messages-fetch-error' });
  }, [messagesError, messagesFetchError]);

  const reprocessLead = useReprocessLead();

  const advanceMutation = useMutation({
    mutationFn: async (leadId: string) => {
      await api.patch(`/leads/${leadId}`, { status: 'ESPECIALISTA' });
    },
    onSuccess: () => {
      toast.success('Lead encaminhado para especialista.');
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      if (selectedLead?.id) {
        void queryClient.invalidateQueries({
          queryKey: ['lead-messages', selectedLead.id],
        });
      }
    },
    onError: () => {
      toast.error('Falha ao encaminhar.');
    },
  });

  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  const handleReprocess = useCallback(() => {
    if (!selectedLead) return;
    reprocessLead.mutate(selectedLead.id, {
      onSuccess: () => {
        toast.success('Lead enviado para reprocessamento.');
        void queryClient.invalidateQueries({
          queryKey: ['lead-messages', selectedLead.id],
        });
      },
      onError: () => {
        toast.error('Falha ao reprocessar. Tente novamente.');
      },
    });
  }, [reprocessLead, queryClient, selectedLead]);

  const leads = leadsData?.data ?? [];

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 flex-1">
      <div className="w-full lg:w-72 h-52 lg:h-auto shrink-0 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800">
        <ConversationList
          leads={leads}
          selectedLeadId={selectedLead?.id ?? null}
          onSelect={handleSelectLead}
          isLoading={leadsLoading}
        />
      </div>

      <div className="flex flex-col flex-1 border-r border-slate-800 min-w-0 min-h-0 lg:min-h-[400px]">
        {selectedLead ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 shrink-0">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-semibold text-blue-300 shrink-0">
                {(selectedLead.name ?? selectedLead.phone ?? '?')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {selectedLead.name ?? 'Sem nome'}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedLead.phone ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/leads/${selectedLead.id}`)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
              >
                Ver ficha completa →
              </button>
            </div>

            <MessageThread
              messages={messages}
              isLoading={messagesLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage ?? false}
              onLoadMore={() => void fetchNextPage()}
            />
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-sm text-slate-500 min-h-[200px]">
            Selecione um atendimento para visualizar a conversa.
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 max-h-[42vh] lg:max-h-none shrink-0 min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l-0 border-slate-800">
        {selectedLead ? (
          <AiInsightPanel
            insight={latestAnalysis}
            lead={selectedLead}
            isLoading={messagesLoading}
            onReprocess={handleReprocess}
            onAdvance={() => advanceMutation.mutate(selectedLead.id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500 border-l border-slate-800 bg-slate-900/50">
            Selecione um atendimento para ver a análise da IA.
          </div>
        )}
      </div>
    </div>
  );
}

/** Alias da spec Fase 8.1 */
export const MessagingPage = Messaging;
