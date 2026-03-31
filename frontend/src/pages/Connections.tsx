import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  Zap,
  Settings2,
  Trash2,
  Send,
} from 'lucide-react';
import {
  useWhatsAppSession,
  useConfigureWhatsAppSession,
  useResetWhatsAppSession,
  useReconnectWhatsApp,
  useSendWhatsAppMessage,
  type WhatsAppSession,
  type ConnectionStatus,
} from '../hooks/useWhatsappSession';
import {
  ConfigureWhatsAppSessionSchema,
  type ConfigureWhatsAppSessionFormData,
} from '../schemas';
import { useAuthStore } from '../store/auth.store';
import { cn, formatApiError, timeAgo } from '../lib/utils';

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; icon: React.ElementType; color: string; dot: string }
> = {
  CONNECTED: {
    label: 'Conectado',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  DISCONNECTED: {
    label: 'Desconectado',
    icon: WifiOff,
    color: 'text-red-400',
    dot: 'bg-red-400',
  },
  CONNECTING: {
    label: 'Conectando…',
    icon: Loader2,
    color: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  QR_PENDING: {
    label: 'Aguardando QR',
    icon: QrCode,
    color: 'text-blue-400',
    dot: 'bg-blue-400',
  },
};

function QrDisplay({ qrCode }: { qrCode: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-xl mt-3">
      {qrCode.startsWith('data:image') ? (
        <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
      ) : (
        <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-lg">
          <div className="text-center">
            <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono break-all px-2">
              {qrCode.slice(0, 40)}…
            </p>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-600 text-center leading-relaxed max-w-xs">
        Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie o
        código
      </p>
    </div>
  );
}

function SessionCard({
  session,
  isAdmin,
  canSend,
}: {
  session: WhatsAppSession;
  isAdmin: boolean;
  canSend: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const reconnect = useReconnectWhatsApp();
  const resetSession = useResetWhatsAppSession();
  const sendMsg = useSendWhatsAppMessage();

  const meta = STATUS_META[session.status];
  const StatusIcon = meta.icon;

  const {
    register: registerSend,
    handleSubmit: handleSendSubmit,
    reset: resetSend,
    formState: { errors: sendErrors },
  } = useForm<{ to: string; text: string }>({
    defaultValues: { to: '', text: '' },
  });

  const onSend = (data: { to: string; text: string }) => {
    sendMsg.mutate(data, {
      onSuccess: () => resetSend(),
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{session.name}</h3>
              <p className="text-slate-500 text-xs font-mono mt-0.5">
                {session.instanceName}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              session.status === 'CONNECTED'
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : session.status === 'QR_PENDING'
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : session.status === 'CONNECTING'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-red-500/10 border border-red-500/20',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                meta.dot,
                session.status === 'CONNECTING' && 'animate-pulse',
              )}
            />
            <StatusIcon
              className={cn(
                'w-3.5 h-3.5',
                meta.color,
                session.status === 'CONNECTING' && 'animate-spin',
              )}
            />
            <span className={meta.color}>{meta.label}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
          {session.phone && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              <span>{session.phone}</span>
            </div>
          )}
          {session.lastSeenAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Visto {timeAgo(session.lastSeenAt)}</span>
            </div>
          )}
        </div>
      </div>

      {session.status === 'QR_PENDING' && session.qrCode && (
        <div className="border-t border-slate-800 px-5 pb-5">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="w-full flex items-center justify-between py-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              {showQr ? 'Ocultar QR Code' : 'Ver QR Code para conectar'}
            </span>
            <span className="text-slate-500 text-xs">{showQr ? '▲' : '▼'}</span>
          </button>
          {showQr && <QrDisplay qrCode={session.qrCode} />}
        </div>
      )}

      {canSend && (
        <div className="border-t border-slate-800 px-5 py-4 space-y-3 bg-slate-900/40">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Enviar mensagem
          </p>
          <form
            onSubmit={handleSendSubmit(onSend)}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              {...registerSend('to', { required: true })}
              placeholder="Número (ex: 5511999999999)"
              className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500"
            />
            <input
              {...registerSend('text', { required: true })}
              placeholder="Texto"
              className="flex-[2] px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={sendMsg.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {sendMsg.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar
            </button>
          </form>
          {(sendErrors.to || sendErrors.text) && (
            <p className="text-red-400 text-xs">Preencha número e texto.</p>
          )}
          {sendMsg.isError && (
            <p className="text-red-400 text-xs">
              {formatApiError(sendMsg.error).message}
            </p>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="border-t border-slate-800 px-5 py-3 flex flex-wrap items-center gap-2 bg-slate-900/50">
          {session.status !== 'CONNECTED' && session.status !== 'CONNECTING' && (
            <button
              type="button"
              onClick={() => reconnect.mutate()}
              disabled={reconnect.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5',
                  reconnect.isPending && 'animate-spin',
                )}
              />
              Novo QR / reconectar
            </button>
          )}

          <div className="flex-1 min-w-[1rem]" />

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar sessão
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-red-400">Resetar estado local?</span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded text-xs"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => resetSession.mutate(undefined, { onSuccess: () => setShowResetConfirm(false) })}
                disabled={resetSession.isPending}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center gap-1"
              >
                {resetSession.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                Sim
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfigureSessionModal({
  session,
  onClose,
}: {
  session: WhatsAppSession;
  onClose: () => void;
}) {
  const configure = useConfigureWhatsAppSession();
  const errDisplay = configure.error ? formatApiError(configure.error) : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfigureWhatsAppSessionFormData>({
    resolver: zodResolver(ConfigureWhatsAppSessionSchema),
    defaultValues: {
      name: session.name,
      instanceName: session.instanceName,
    },
  });

  const handleClose = () => {
    configure.reset();
    onClose();
  };

  const onSubmit = (data: ConfigureWhatsAppSessionFormData) => {
    configure.mutate(data, { onSuccess: handleClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Settings2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Sessão WhatsApp</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Nome exibido
            </label>
            <input
              {...register('name')}
              placeholder="ex: WhatsApp Vendas"
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Nome da instância (Baileys)
            </label>
            <input
              {...register('instanceName')}
              placeholder="ex: leadwatch"
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {errors.instanceName && (
              <p className="text-red-400 text-xs">
                {errors.instanceName.message}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Deve coincidir com a instância configurada no serviço Baileys.
            </p>
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <p className="text-xs text-blue-300 leading-relaxed">
              Há apenas uma sessão global. Alterar o nome da instância dispara
              estado de novo QR no painel.
            </p>
          </div>

          {errDisplay && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
              <p className="text-red-400 text-xs flex items-start gap-1.5 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errDisplay.message}</span>
              </p>
              {errDisplay.hint && (
                <p className="text-slate-400 text-xs pl-5 leading-relaxed">
                  {errDisplay.hint}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={configure.isPending}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {configure.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Connections() {
  const { data: session, isLoading, isFetching } = useWhatsAppSession();
  const { user } = useAuthStore();
  const [showConfigure, setShowConfigure] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const canSend =
    user?.role === 'ADMIN' || user?.role === 'AGENT';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessão WhatsApp</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isLoading
              ? 'Carregando…'
              : session
                ? `Instância única — ${STATUS_META[session.status].label.toLowerCase()}`
                : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Atualizando
            </div>
          )}
          {isAdmin && session && (
            <button
              type="button"
              onClick={() => setShowConfigure(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-sm font-medium transition-all"
            >
              <Settings2 className="w-4 h-4" />
              Configurar
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl h-36 animate-pulse" />
      ) : session ? (
        <SessionCard
          session={session}
          isAdmin={isAdmin}
          canSend={canSend}
        />
      ) : null}

      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-amber-300 text-sm font-medium">Integração Baileys</p>
          <p className="text-amber-300/60 text-xs leading-relaxed">
            O webhook público é{' '}
            <code className="font-mono text-amber-200/90">
              /api/v1/webhooks/baileys
            </code>{' '}
            (HMAC{' '}
            <span className="font-mono">x-baileys-signature</span>). Envio de
            mensagens requer{' '}
            <span className="font-mono">BAILEYS_MESSAGE_URL</span> no backend.
          </p>
        </div>
      </div>

      {showConfigure && session && (
        <ConfigureSessionModal
          session={session}
          onClose={() => setShowConfigure(false)}
        />
      )}
    </div>
  );
}
