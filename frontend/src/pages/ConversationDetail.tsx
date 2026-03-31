import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Phone,
  Car,
  Mail,
  RefreshCw,
  Clock,
  AlertTriangle,
  ChevronRight,
  Bot,
  User,
} from 'lucide-react';
import { useLead, useLeadHistory } from '../hooks/useLead';
import { useUpdateLead, useReprocessLead } from '../hooks/useLeads';
import { UpdateLeadSchema, type UpdateLeadFormData } from '../schemas';
import {
  cn,
  formatPhone,
  formatDate,
  timeAgo,
  isRecent,
  STATUS_LABELS,
  STATUS_COLORS,
  SENTIMENT_COLORS,
} from '../lib/utils';

export function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id ?? '');
  const { data: history } = useLeadHistory(id ?? '');
  const updateLead = useUpdateLead();
  const reprocess = useReprocessLead();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateLeadFormData>({
    resolver: zodResolver(UpdateLeadSchema),
    values: {
      name: lead?.name ?? '',
      plate: lead?.plate ?? '',
      email: lead?.email ?? '',
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-96 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!lead) return null;

  const onSave = (data: UpdateLeadFormData) => {
    updateLead.mutate({ id: lead.id, data });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {lead.name ?? 'Sem nome'}
            </h1>
            <span
              className={cn(
                'px-2.5 py-1 rounded-lg text-sm font-medium border',
                STATUS_COLORS[lead.status],
              )}
            >
              {STATUS_LABELS[lead.status]}
            </span>
            {isRecent(lead.lastMessageAt) && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recente
              </span>
            )}
            {lead.needsHumanReview && (
              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded border border-red-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Revisar
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">
            Última interação: {timeAgo(lead.lastMessageAt)}
          </p>
        </div>
        <button
          onClick={() => reprocess.mutate(lead.id)}
          disabled={reprocess.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-all"
        >
          <RefreshCw
            className={cn('w-4 h-4', reprocess.isPending && 'animate-spin')}
          />
          Reprocessar IA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Edit Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Analysis Card */}
          {lead.confidenceScore !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                Análise da IA
              </h3>
              <div className="space-y-3">
                {lead.intent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Intenção</span>
                    <span className="text-white font-medium">{lead.intent}</span>
                  </div>
                )}
                {lead.sentiment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sentimento</span>
                    <span
                      className={cn(
                        'font-medium',
                        SENTIMENT_COLORS[lead.sentiment],
                      )}
                    >
                      {lead.sentiment}
                    </span>
                  </div>
                )}
                {lead.confidenceScore !== null && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Confiança</span>
                      <span className="text-white">
                        {Math.round(lead.confidenceScore * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          lead.confidenceScore >= 0.8
                            ? 'bg-emerald-500'
                            : lead.confidenceScore >= 0.6
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                        style={{ width: `${lead.confidenceScore * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {lead.summary && (
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lead.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Dados do Lead
            </h3>
            <form onSubmit={handleSubmit(onSave)} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Phone className="w-3 h-3" />
                  Telefone
                </label>
                <p className="text-white text-sm font-mono bg-slate-800 px-3 py-2 rounded-lg">
                  {formatPhone(lead.phone)}
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <User className="w-3 h-3" />
                  Nome
                </label>
                <input
                  {...register('name')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Car className="w-3 h-3" />
                  Placa
                </label>
                <input
                  {...register('plate')}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Mail className="w-3 h-3" />
                  E-mail
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {isDirty && (
                <button
                  type="submit"
                  disabled={updateLead.isPending}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {updateLead.isPending ? 'Salvando...' : 'Salvar alterações'}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right: Messages + History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Messages */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">
              Mensagens Recentes
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {lead.messages?.length === 0 && (
                <p className="text-slate-500 text-sm">Sem mensagens</p>
              )}
              {lead.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.fromMe ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-xs lg:max-w-md px-3 py-2 rounded-xl text-sm',
                      msg.fromMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-200',
                    )}
                  >
                    <p>{msg.body}</p>
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
          </div>

          {/* Funnel Timeline */}
          {history?.funnelEvents && history.funnelEvents.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">
                Histórico do Funil
              </h3>
              <div className="space-y-3">
                {history.funnelEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs border',
                        STATUS_COLORS[event.fromStatus],
                      )}
                    >
                      {STATUS_LABELS[event.fromStatus]}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs border',
                        STATUS_COLORS[event.toStatus],
                      )}
                    >
                      {STATUS_LABELS[event.toStatus]}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-xs text-slate-500">
                        {timeAgo(event.createdAt)}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {event.triggeredBy === 'AI' ? '🤖 IA' : '👤 Humano'}
                        {event.reason ? ` — ${event.reason}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
