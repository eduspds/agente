import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bot, Loader2 } from 'lucide-react';
import type { MessageItem } from '@/types';
import { cn } from '@/lib/utils';

interface MessageThreadProps {
  messages: MessageItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return `Hoje ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ontem ${format(date, 'HH:mm')}`;
  return format(date, "dd 'de' MMMM · HH:mm", { locale: ptBR });
}

function shouldShowDivider(
  prev: MessageItem | undefined,
  curr: MessageItem,
): boolean {
  if (!prev) return true;
  const prevDate = new Date(prev.timestamp);
  const currDate = new Date(curr.timestamp);
  return currDate.getTime() - prevDate.getTime() > 10 * 60 * 1000;
}

export function MessageThread({
  messages,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, messages.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center px-8 min-h-[200px]">
        <p className="text-sm text-slate-500">Nenhuma mensagem registrada ainda.</p>
      </div>
    );
  }

  const aiMarkers = new Set<string>();
  for (let i = 0; i < messages.length - 1; i++) {
    if (!messages[i].processed && messages[i + 1].processed) {
      aiMarkers.add(messages[i + 1].id);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 py-3 gap-1 bg-slate-950/40">
      {hasNextPage && (
        <button
          type="button"
          onClick={() => onLoadMore()}
          disabled={isFetchingNextPage}
          className="self-center text-xs text-slate-400 hover:text-slate-200 py-1 px-3 rounded-full border border-slate-700 bg-slate-900 mb-2 transition-colors disabled:opacity-50"
        >
          {isFetchingNextPage ? (
            <Loader2 className="w-3 h-3 animate-spin inline mr-1 align-middle" />
          ) : null}
          Carregar mensagens anteriores
        </button>
      )}

      {messages.map((msg, idx) => {
        const prev = messages[idx - 1];
        const showDivider = shouldShowDivider(prev, msg);
        const isAiMarker = aiMarkers.has(msg.id);

        return (
          <div key={msg.id}>
            {showDivider && (
              <div className="flex items-center justify-center my-3">
                <span className="text-[11px] text-slate-500 bg-slate-800/80 border border-slate-700 px-3 py-0.5 rounded-full">
                  {formatMessageDate(msg.timestamp)}
                </span>
              </div>
            )}

            {isAiMarker && (
              <div className="flex items-center justify-center my-2 gap-1.5">
                <div className="h-px flex-1 bg-slate-700" />
                <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">
                  <Bot className="w-3 h-3" />
                  IA processou
                </span>
                <div className="h-px flex-1 bg-slate-700" />
              </div>
            )}

            <div
              className={cn(
                'flex',
                msg.fromMe ? 'justify-end' : 'justify-start',
                'mb-0.5',
              )}
            >
              <div
                className={cn(
                  'max-w-[72%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed',
                  msg.fromMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-sm',
                )}
              >
                {msg.body}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
