import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bot,
  ListChecks,
  Plus,
  X,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Hash,
  Building2,
} from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { SettingsSchema, type SettingsFormData } from '../schemas';
import { useAuthStore } from '../store/auth.store';
import { cn } from '../lib/utils';

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-800 rounded-xl">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold">{title}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{description}</p>
        </div>
      </div>
      <div className="border-t border-slate-800 pt-5">{children}</div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all';

const SUGGESTED_FIELDS = ['name', 'plate', 'email', 'cpf', 'phone', 'city'];

export function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: '',
      aiPrompt: '',
      requiredFields: ['name'],
    },
  });

  const requiredFields = watch('requiredFields') ?? [];

  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name,
        aiPrompt: settings.aiPrompt,
        requiredFields:
          settings.requiredFields.length > 0
            ? settings.requiredFields
            : ['name'],
      });
    }
  }, [settings, reset]);

  const onSubmit = (data: SettingsFormData) => {
    updateSettings.mutate({
      name: data.name,
      aiPrompt: data.aiPrompt,
      requiredFields: data.requiredFields,
    });
  };

  const addField = (field: string) => {
    const cur = watch('requiredFields') ?? [];
    if (!cur.includes(field)) {
      setValue('requiredFields', [...cur, field], { shouldDirty: true });
    }
  };

  const removeField = (index: number) => {
    const cur = watch('requiredFields') ?? [];
    setValue(
      'requiredFields',
      cur.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-2xl h-48 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie as configurações da sua conta LeadWatch
          </p>
        </div>
        {settings && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
            <Hash className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 text-xs font-mono">
              prompt v{settings.promptVersion}
            </span>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            Apenas administradores podem editar as configurações.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section
          icon={Building2}
          title="Informações da conta"
          description="Nome da sua organização no LeadWatch"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Nome da conta
            </label>
            <input
              {...register('name')}
              disabled={!isAdmin}
              className={cn(inputCls, !isAdmin && 'opacity-50 cursor-not-allowed')}
              placeholder="Minha Empresa"
            />
            {errors.name && (
              <p className="text-red-400 text-xs">{errors.name.message}</p>
            )}
          </div>
        </Section>

        <Section
          icon={Bot}
          title="Prompt de IA"
          description="Instruções enviadas ao modelo. Use {'{phone}'} e {'{messages}'} como variáveis."
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Prompt base
              </label>
              <textarea
                {...register('aiPrompt')}
                disabled={!isAdmin}
                rows={12}
                className={cn(
                  inputCls,
                  'resize-none font-mono text-xs leading-relaxed',
                  !isAdmin && 'opacity-50 cursor-not-allowed',
                )}
                placeholder="Você é um assistente especializado em..."
              />
              {errors.aiPrompt && (
                <p className="text-red-400 text-xs">{errors.aiPrompt.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Variáveis disponíveis:</span>
              {['{phone}', '{messages}'].map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-blue-400"
                >
                  {v}
                </span>
              ))}
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
              <p className="text-xs text-blue-300 leading-relaxed">
                <span className="font-semibold">Dica:</span> O prompt deve instruir
                o modelo a retornar JSON com: intent, sentiment, confidenceScore,
                extractedFields, summary, missingFields, disqualifyReason.
              </p>
            </div>
          </div>
        </Section>

        <Section
          icon={ListChecks}
          title="Campos obrigatórios"
          description="Campos necessários para qualificar um lead automaticamente."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {requiredFields.map((field, i) => (
                <div
                  key={`${field}-${i}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                >
                  <span className="text-blue-300 text-sm font-mono">{field}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="text-blue-400/60 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {requiredFields.length === 0 && (
                <p className="text-slate-500 text-sm">Nenhum campo configurado</p>
              )}
            </div>

            {errors.requiredFields && (
              <p className="text-red-400 text-xs">
                {errors.requiredFields.message}
              </p>
            )}

            {isAdmin && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Sugeridos
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_FIELDS.filter((f) => !requiredFields.includes(f)).map(
                    (field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => addField(field)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg text-sm text-slate-400 hover:text-blue-300 transition-all font-mono"
                      >
                        <Plus className="w-3 h-3" />
                        {field}
                      </button>
                    ),
                  )}
                </div>

                <AddCustomFieldInput
                  existing={requiredFields}
                  onAdd={(f) => addField(f)}
                />
              </div>
            )}
          </div>
        </Section>

        {isAdmin && (
          <div className="flex items-center justify-between py-2">
            <div className="h-6">
              {updateSettings.isSuccess && !isDirty && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Configurações salvas com sucesso
                </div>
              )}
              {updateSettings.isError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Erro ao salvar. Tente novamente.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={updateSettings.isPending || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar configurações
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function AddCustomFieldInput({
  existing,
  onAdd,
}: {
  existing: string[];
  onAdd: (field: string) => void;
}) {
  const [value, setValueState] = useState('');
  const [error, setError] = useState('');

  const handle = () => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[a-z_]+$/.test(trimmed)) {
      setError('Apenas letras minúsculas e _');
      return;
    }
    if (existing.includes(trimmed)) {
      setError('Campo já adicionado');
      return;
    }
    onAdd(trimmed);
    setValueState('');
    setError('');
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValueState(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handle();
            }
          }}
          placeholder="campo_personalizado"
          className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
        />
        <button
          type="button"
          onClick={handle}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
