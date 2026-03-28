interface Msg {
  id: string
  fromMe: boolean
  body: string
  timestamp: string
}

export default function ConversationMessages({ messages }: { messages: Msg[] }) {
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.fromMe
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-md'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{m.body}</p>
            <p
              className={`text-[10px] mt-1.5 ${
                m.fromMe ? 'text-emerald-200/80' : 'text-slate-500'
              }`}
            >
              {new Date(m.timestamp).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
