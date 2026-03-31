import type { Message } from '../../types/models';
import { formatDate, cn } from '../../lib/utils';

interface ConversationMessagesProps {
  messages: Message[];
}

export function ConversationMessages({ messages }: ConversationMessagesProps) {
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto p-4">
      {messages.length === 0 && (
        <p className="text-slate-500 text-sm text-center py-4">
          Sem mensagens capturadas
        </p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn('flex', msg.fromMe ? 'justify-end' : 'justify-start')}
        >
          <div
            className={cn(
              'max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm',
              msg.fromMe
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-200',
            )}
          >
            <p className="leading-relaxed">{msg.body}</p>
            <p
              className={cn(
                'text-xs mt-1',
                msg.fromMe ? 'text-blue-200' : 'text-slate-500',
              )}
            >
              {formatDate(msg.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
