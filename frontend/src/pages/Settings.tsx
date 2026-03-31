import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Settings as SettingsIcon, Save, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  aiPrompt: string;
  promptVersion: number;
  requiredFields: string[];
}

export function Settings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<TenantSettings>('/settings');
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<TenantSettings>) => {
      const response = await api.patch<TenantSettings>('/settings', data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const { register, handleSubmit } = useForm({
    values: settings,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-96 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400 text-sm">
            Gerenciar configurações do tenant — Prompt versão{' '}
            <span className="text-blue-400 font-mono">
              {settings?.promptVersion}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((data) => updateSettings.mutate(data))}
        className="space-y-6"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Informações do Tenant</h3>

          <div>
            <label className="text-sm text-slate-400 mb-1.5 block">
              Nome da empresa
            </label>
            <input
              {...register('name')}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold">Prompt da IA</h3>
          <p className="text-slate-400 text-xs">
            Use{' '}
            <code className="text-blue-400 bg-slate-800 px-1 rounded">
              {'{phone}'}
            </code>{' '}
            e{' '}
            <code className="text-blue-400 bg-slate-800 px-1 rounded">
              {'{messages}'}
            </code>{' '}
            como variáveis. Alterar o prompt incrementa automaticamente a
            versão.
          </p>
          <textarea
            {...register('aiPrompt')}
            rows={12}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {updateSettings.isSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" /> Salvo
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {updateSettings.isPending ? 'Salvando...' : 'Salvar configurações'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
