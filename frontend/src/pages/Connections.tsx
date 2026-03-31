import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Smartphone,
  Plus,
  Trash2,
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
} from 'lucide-react';
import {
  useConnections,
  useCreateConnection,
  useDeleteConnection,
  useReconnect,
  type WhatsAppConnection,
  type ConnectionStatus,
} from '../hooks/useConnections';
import {
  CreateConnectionSchema,
  type CreateConnectionFormData,
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

function ConnectionCard({
  conn,
  isAdmin,
}: {
  conn: WhatsAppConnection;
  isAdmin: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const reconnect = useReconnect();
  const deleteConn = useDeleteConnection();

  const meta = STATUS_META[conn.status];
  const StatusIcon = meta.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{conn.name}</h3>
              <p className="text-slate-500 text-xs font-mono mt-0.5">
                {conn.instanceName}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              conn.status === 'CONNECTED'
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : conn.status === 'QR_PENDING'
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : conn.status === 'CONNECTING'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-red-500/10 border border-red-500/20',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                meta.dot,
                conn.status === 'CONNECTING' && 'animate-pulse',
              )}
            />
            <StatusIcon
              className={cn(
                'w-3.5 h-3.5',
                meta.color,
                conn.status === 'CONNECTING' && 'animate-spin',
              )}
            />
            <span className={meta.color}>{meta.label}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
          {conn.phone && (
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3" />
              <span>{conn.phone}</span>
            </div>
          )}
          {conn.lastSeenAt && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Visto {timeAgo(conn.lastSeenAt)}</span>
            </div>
          )}
        </div>
      </div>

      {conn.status === 'QR_PENDING' && conn.qrCode && (
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
          {showQr && <QrDisplay qrCode={conn.qrCode} />}
        </div>
      )}

      {isAdmin && (
        <div className="border-t border-slate-800 px-5 py-3 flex items-center gap-2 bg-slate-900/50">
          {conn.status !== 'CONNECTED' && conn.status !== 'CONNECTING' && (
            <button
              type="button"
              onClick={() => reconnect.mutate(conn.id)}
              disabled={reconnect.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-all"
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5',
                  reconnect.isPending && 'animate-spin',
                )}
              />
              Reconectar
            </button>
          )}

          <div className="flex-1" />

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remover
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Confirmar remoção?</span>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded text-xs"
              >
                Não
              </button>
              <button
                type="button"
                onClick={() => deleteConn.mutate(conn.id)}
                disabled={deleteConn.isPending}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center gap-1"
              >
                {deleteConn.isPending && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                Sim, remover
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateConnectionModal({ onClose }: { onClose: () => void }) {
  const createConn = useCreateConnection();
  const errDisplay = createConn.error
    ? formatApiError(createConn.error)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateConnectionFormData>({
    resolver: zodResolver(CreateConnectionSchema),
  });

  const handleClose = () => {
    createConn.reset();
    onClose();
  };

  const onSubmit = (data: CreateConnectionFormData) => {
    createConn.mutate(data, { onSuccess: handleClose });
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
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Nova conexão</h2>
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
              Nome da conexão
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
              Nome da instância
            </label>
            <input
              {...register('instanceName')}
              placeholder="ex: vendas-principal"
              className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {errors.instanceName && (
              <p className="text-red-400 text-xs">
                {errors.instanceName.message}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Apenas letras minúsculas, números, hífens e sublinhados
            </p>
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <p className="text-xs text-blue-300 leading-relaxed">
              Registro criado no LeadWatch. A integração com Baileys/Evolution pode
              preencher QR e status; enquanto isso, use o webhook com o{' '}
              <span className="font-mono">instanceName</span> correspondente.
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
              disabled={createConn.isPending}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createConn.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Criar conexão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Connections() {
  const { data: connections, isLoading, isFetching } = useConnections();
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const connectedCount =
    connections?.filter((c) => c.status === 'CONNECTED').length ?? 0;
  const total = connections?.length ?? 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Conexões WhatsApp</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isLoading
              ? 'Carregando…'
              : `${connectedCount} de ${total} instância${total !== 1 ? 's' : ''} ativa${connectedCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Atualizando
            </div>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Nova conexão
            </button>
          )}
        </div>
      </div>

      {!isLoading && total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              {
                label: 'Conectadas',
                value:
                  connections?.filter((c) => c.status === 'CONNECTED').length ??
                  0,
                color: 'text-emerald-400',
                icon: Wifi,
              },
              {
                label: 'Aguardando QR',
                value:
                  connections?.filter((c) => c.status === 'QR_PENDING').length ??
                  0,
                color: 'text-blue-400',
                icon: QrCode,
              },
              {
                label: 'Desconectadas',
                value:
                  connections?.filter((c) => c.status === 'DISCONNECTED')
                    .length ?? 0,
                color: 'text-red-400',
                icon: WifiOff,
              },
            ] as const
          ).map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3"
            >
              <Icon className={cn('w-5 h-5', color)} />
              <div>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl h-36 animate-pulse"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 flex flex-col items-center gap-4">
          <div className="p-4 bg-slate-800 rounded-2xl">
            <Smartphone className="w-10 h-10 text-slate-500" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium">Nenhuma conexão configurada</p>
            <p className="text-slate-500 text-sm mt-1">
              Adicione uma instância para organizar webhooks por{' '}
              <span className="font-mono">instanceName</span>
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-all mt-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar conexão
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {connections?.map((conn) => (
            <ConnectionCard key={conn.id} conn={conn} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-amber-300 text-sm font-medium">
            Sobre as conexões
          </p>
          <p className="text-amber-300/60 text-xs leading-relaxed">
            O LeadWatch monitora conversas de forma passiva. O status é atualizado
            a cada 10 segundos. Conecte seu serviço Baileys ao webhook e use o
            header <span className="font-mono">X-Tenant-ID</span> com o ID do
            tenant.
          </p>
        </div>
      </div>

      {showCreate && (
        <CreateConnectionModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
