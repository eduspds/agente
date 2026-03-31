import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  UserPlus,
  Pencil,
  Trash2,
  Shield,
  Eye,
  User,
  X,
  Loader2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type UpdateUserPayload,
} from '../hooks/useUsers';
import {
  CreateUserSchema,
  EditUserSchema,
  type CreateUserFormData,
  type EditUserFormData,
} from '../schemas';
import { useAuthStore } from '../store/auth.store';
import type { User as UserModel, Role } from '../types/models';
import { cn, formatDate } from '../lib/utils';

const ROLE_META: Record<
  Role,
  { label: string; icon: React.ElementType; color: string }
> = {
  ADMIN: {
    label: 'Admin',
    icon: Shield,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  AGENT: {
    label: 'Agente',
    icon: User,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  VIEWER: {
    label: 'Visualizador',
    icon: Eye,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  },
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all';

const selectCls =
  'w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer';

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { role: 'AGENT' },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUser.mutate(data, { onSuccess: onClose });
  };

  return (
    <ModalShell title="Novo usuário" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nome completo" error={errors.name?.message}>
          <input
            {...register('name')}
            placeholder="João Silva"
            className={inputCls}
          />
        </Field>

        <Field label="E-mail" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="joao@empresa.com"
            className={inputCls}
          />
        </Field>

        <Field label="Senha" error={errors.password?.message}>
          <input
            {...register('password')}
            type="password"
            placeholder="Mínimo 8 caracteres (maiúscula, minúscula e número)"
            className={inputCls}
          />
        </Field>

        <Field label="Perfil" error={errors.role?.message}>
          <select {...register('role')} className={selectCls}>
            <option value="ADMIN">Admin</option>
            <option value="AGENT">Agente</option>
            <option value="VIEWER">Visualizador</option>
          </select>
        </Field>

        {createUser.error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Erro ao criar usuário. Verifique se o e-mail já está em uso.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createUser.isPending}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar usuário
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  onClose,
}: {
  user: UserModel;
  onClose: () => void;
}) {
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(EditUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    },
  });

  const onSubmit = (data: EditUserFormData) => {
    const payload: UpdateUserPayload = {
      name: data.name,
      email: data.email,
      role: data.role,
    };
    if (data.password && data.password.length > 0) {
      payload.password = data.password;
    }
    updateUser.mutate({ id: user.id, data: payload }, { onSuccess: onClose });
  };

  return (
    <ModalShell title="Editar usuário" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nome completo" error={errors.name?.message}>
          <input {...register('name')} className={inputCls} />
        </Field>

        <Field label="E-mail" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputCls} />
        </Field>

        <Field
          label="Nova senha (deixe em branco para manter)"
          error={errors.password?.message}
        >
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className={inputCls}
          />
        </Field>

        <Field label="Perfil" error={errors.role?.message}>
          <select {...register('role')} className={selectCls}>
            <option value="ADMIN">Admin</option>
            <option value="AGENT">Agente</option>
            <option value="VIEWER">Visualizador</option>
          </select>
        </Field>

        {updateUser.error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Erro ao atualizar usuário.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateUser.isPending || !isDirty}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteConfirmModal({
  user,
  onClose,
}: {
  user: UserModel;
  onClose: () => void;
}) {
  const deleteUser = useDeleteUser();

  return (
    <ModalShell title="Remover usuário" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-300 text-sm">
            Tem certeza que deseja desativar{' '}
            <span className="font-semibold text-red-200">{user.name}</span>? O
            acesso será revogado.
          </p>
        </div>

        {deleteUser.error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Erro ao remover usuário.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => deleteUser.mutate(user.id, { onSuccess: onClose })}
            disabled={deleteUser.isPending}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleteUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Desativar
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: UserModel }
  | { type: 'delete'; user: UserModel }
  | null;

export function Users() {
  const { data, isLoading } = useUsers();
  const { user: currentUser } = useAuthStore();
  const [modal, setModal] = useState<ModalState>(null);
  const [search, setSearch] = useState('');

  const users = data?.data ?? [];
  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-slate-400 text-sm mt-1">
            {users.length} usuário{users.length !== 1 ? 's' : ''} na conta
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setModal({ type: 'create' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4" />
            Novo usuário
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-800 rounded w-40" />
                    <div className="h-3 bg-slate-800 rounded w-60" />
                  </div>
                  <div className="h-6 w-20 bg-slate-800 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <User className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            <div className="grid grid-cols-[1fr_200px_140px_100px] gap-4 px-6 py-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Usuário
              </span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                E-mail
              </span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Perfil
              </span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Criado em
              </span>
            </div>

            {filtered.map((u) => {
              const meta = ROLE_META[u.role];
              const RoleIcon = meta.icon;
              const isSelf = u.id === currentUser?.id;

              return (
                <div
                  key={u.id}
                  className="grid grid-cols-[1fr_200px_140px_100px] gap-4 items-center px-6 py-4 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {u.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-slate-500">
                            (você)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm truncate">{u.email}</p>

                  <div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                        meta.color,
                      )}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">
                      {formatDate(u.createdAt ?? null).split(' ')[0]}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'edit', user: u })}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'delete', user: u })}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Desativar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal?.type === 'create' && (
        <CreateUserModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <EditUserModal user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal user={modal.user} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
