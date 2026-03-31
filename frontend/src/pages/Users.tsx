import { useQuery } from '@tanstack/react-query';
import { UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types/models';
import { formatDate, cn } from '../lib/utils';

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  AGENT: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  VIEWER: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export function Users() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<User[]>('/users');
      return data;
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerenciar acessos da equipe
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all">
          <UserPlus className="w-4 h-4" />
          Convidar usuário
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Usuário
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                        {user.role === 'ADMIN' ? (
                          <Shield className="w-4 h-4 text-violet-400" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium border',
                        ROLE_STYLES[user.role] ?? ROLE_STYLES.VIEWER,
                      )}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-400 text-xs">● Ativo</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-400 text-sm">
                      {formatDate(user.id)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
