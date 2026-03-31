import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Brain,
  Key,
  Cpu,
  FileText,
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Thermometer,
  Timer,
  Hash,
  RefreshCw,
  Shield,
  Info,
} from 'lucide-react';
import {
  useAiConfig,
  useSaveAiConfig,
  useTestAiConnection,
  type AiProvider,
  type AiConfigDraft,
} from '../hooks/useAiConfig';
import { cn } from '../lib/utils';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const PROVIDERS: {
  id: AiProvider;
  name: string;
  logo: string;
  description: string;
  models: { id: string; label: string; context: string }[];
  baseUrlEditable: boolean;
}[] = [
  {
    id: 'google',
    name: 'Google Gemini',
    logo: '✦',
    description: 'Modelos Gemini do Google. Recomendado para uso atual.',
    baseUrlEditable: false,
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', context: '1M tokens' },
      { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', context: '1M tokens' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', context: '2M tokens' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', context: '1M tokens' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    logo: '⬡',
    description: 'GPT-4o e família. Compatível com qualquer API OpenAI-like.',
    baseUrlEditable: false,
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', context: '128k tokens' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', context: '128k tokens' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', context: '128k tokens' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    logo: '◈',
    description: 'Claude Sonnet e Haiku para análise contextual avançada.',
    baseUrlEditable: false,
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', context: '200k tokens' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', context: '200k tokens' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom / OpenAI-compatible',
    logo: '⬡',
    description: 'Qualquer endpoint compatível com a API OpenAI (Ollama, Together, etc.).',
    baseUrlEditable: true,
    models: [
      { id: 'custom', label: 'Configurar manualmente', context: '—' },
    ],
  },
];

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente especializado em qualificação de leads de seguro automotivo.
Analise as mensagens abaixo e retorne um JSON válido com a estrutura especificada.

Contexto do lead: phone={phone}
Mensagens (ordem cronológica):
{messages}

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "intent": "NEGOCIACAO" | "SUPORTE" | "SOCIAL",
  "sentiment": "POSITIVO" | "NEUTRO" | "NEGATIVO",
  "confidenceScore": 0.0-1.0,
  "extractedFields": {
    "name": string | null,
    "plate": string | null,
    "email": string | null
  },
  "summary": string,
  "missingFields": string[],
  "disqualifyReason": string | null
}`;

const SUGGESTED_REQUIRED_FIELDS = ['name', 'plate', 'email', 'cpf', 'phone'];

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const ProviderSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic', 'custom']),
  apiKey: z.string().min(8, 'Chave de API obrigatória'),
  baseUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

const ModelSchema = z.object({
  model: z.string().min(1, 'Selecione um modelo'),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(8192),
  timeoutMs: z.number().int().min(5000).max(120000),
  maxRetries: z.number().int().min(0).max(5),
  cacheTtlSeconds: z.number().int().min(0).max(86400),
});

const PromptSchema = z.object({
  systemPrompt: z.string().min(20, 'Prompt muito curto').max(16000),
  truncateMaxMessages: z.number().int().min(1).max(100),
  truncateMaxChars: z.number().int().min(1000).max(16000),
});

const TriggerSchema = z.object({
  qualificationKeywords: z.array(z.string()),
  disqualificationKeywords: z.array(z.string()),
  debounceMinutes: z.number().int().min(1).max(60),
  confidenceThreshold: z.number().min(0).max(1),
  requiredFields: z.array(z.string()).min(1, 'Ao menos um campo obrigatório'),
});

type ProviderForm = z.infer<typeof ProviderSchema>;
type ModelForm = z.infer<typeof ModelSchema>;
type PromptForm = z.infer<typeof PromptSchema>;
type TriggerForm = z.infer<typeof TriggerSchema>;

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
      {children}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5 mt-1">
      <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-600" />
      {children}
    </p>
  );
}

const inputCls =
  'w-full px-3 py-2.5 bg-slate-950 border border-slate-700/60 rounded-lg text-white text-sm font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60 transition-all';

// ══════════════════════════════════════════════════════════════════════════════
// STEP INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

const STEPS = [
  { id: 0, label: 'Provedor', icon: Key },
  { id: 1, label: 'Modelo', icon: Cpu },
  { id: 2, label: 'Prompt', icon: FileText },
  { id: 3, label: 'Gatilhos', icon: Zap },
];

function StepIndicator({
  current,
  completed,
  onNavigate,
}: {
  current: number;
  completed: Set<number>;
  onNavigate: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone = completed.has(step.id);
        const isActive = current === step.id;
        const canClick = isDone || step.id === 0 || completed.has(step.id - 1);

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => canClick && onNavigate(step.id)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all',
                isActive
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : isDone
                    ? 'text-emerald-400 hover:bg-emerald-500/10 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed',
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border',
                  isActive
                    ? 'border-blue-500 bg-blue-500/20'
                    : isDone
                      ? 'border-emerald-500 bg-emerald-500/20'
                      : 'border-slate-700 bg-transparent',
                )}
              >
                {isDone && !isActive ? (
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Icon
                    className={cn(
                      'w-2.5 h-2.5',
                      isActive ? 'text-blue-400' : 'text-slate-600',
                    )}
                  />
                )}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-8 h-px mx-1 transition-colors',
                  completed.has(step.id) ? 'bg-emerald-500/40' : 'bg-slate-800',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

function StepProvider({
  defaultValues,
  onNext,
}: {
  defaultValues: Partial<ProviderForm>;
  onNext: (data: ProviderForm) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const testConn = useTestAiConnection();

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<ProviderForm>({
      resolver: zodResolver(ProviderSchema),
      defaultValues: { provider: 'google', apiKey: '', ...defaultValues },
    });

  const selectedProvider = watch('provider');
  const apiKey = watch('apiKey');
  const providerMeta = PROVIDERS.find((p) => p.id === selectedProvider)!;

  const handleTest = () => {
    if (!apiKey) return;
    const firstModel = providerMeta.models[0].id;
    testConn.mutate({
      provider: selectedProvider,
      apiKey,
      model: firstModel,
    });
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-8">
      {/* Provider grid */}
      <div className="space-y-3">
        <Label>Selecione o provedor</Label>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDERS.map((p) => {
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setValue('provider', p.id, { shouldValidate: true })}
                className={cn(
                  'relative text-left p-4 rounded-xl border transition-all group',
                  isSelected
                    ? 'border-blue-500/60 bg-blue-500/8 shadow-[0_0_20px_rgba(59,130,246,0.08)]'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-600',
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={cn(
                      'text-2xl font-black leading-none',
                      isSelected ? 'text-blue-400' : 'text-slate-600',
                    )}
                  >
                    {p.logo}
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p
                  className={cn(
                    'text-sm font-semibold mb-1',
                    isSelected ? 'text-white' : 'text-slate-400',
                  )}
                >
                  {p.name}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label>Chave de API</Label>
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            {...register('apiKey')}
            type={showKey ? 'text' : 'password'}
            placeholder={
              selectedProvider === 'google'
                ? 'AIza...'
                : selectedProvider === 'openai'
                  ? 'sk-...'
                  : selectedProvider === 'anthropic'
                    ? 'sk-ant-...'
                    : 'Chave de API'
            }
            className={cn(inputCls, 'pl-9 pr-24')}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={!apiKey || testConn.isPending}
              className="px-2 py-1 text-xs text-slate-500 hover:text-blue-400 border border-slate-700 hover:border-blue-500/40 rounded transition-all disabled:opacity-30 font-mono"
            >
              {testConn.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'testar'
              )}
            </button>
          </div>
        </div>
        <FieldError message={errors.apiKey?.message} />
        <Hint>
          A chave é armazenada encriptada e nunca exposta no frontend após salva.
        </Hint>

        {/* Test result */}
        {testConn.data && (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border mt-2',
              testConn.data.success
                ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/8 border-red-500/20 text-red-400',
            )}
          >
            {testConn.data.success ? (
              <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {testConn.data.success
              ? `Conectado — ${testConn.data.latencyMs}ms · modelo: ${testConn.data.model}`
              : `Falha: ${testConn.data.error}`}
          </div>
        )}
        {testConn.isError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border bg-red-500/8 border-red-500/20 text-red-400 mt-2">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            Erro de conexão. Verifique a chave e tente novamente.
          </div>
        )}
      </div>

      {/* Base URL for custom */}
      {providerMeta.baseUrlEditable && (
        <div className="space-y-2">
          <Label>Base URL</Label>
          <input
            {...register('baseUrl')}
            placeholder="https://sua-api.com/v1"
            className={inputCls}
          />
          <FieldError message={errors.baseUrl?.message} />
          <Hint>Endpoint compatível com a API OpenAI (ex: Ollama, Together AI).</Hint>
        </div>
      )}

      <StepNav canBack={false} onBack={() => {}} />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — MODEL
// ══════════════════════════════════════════════════════════════════════════════

function StepModel({
  defaultValues,
  provider,
  onNext,
  onBack,
}: {
  defaultValues: Partial<ModelForm>;
  provider: AiProvider;
  onNext: (data: ModelForm) => void;
  onBack: () => void;
}) {
  const providerMeta = PROVIDERS.find((p) => p.id === provider)!;

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } =
    useForm<ModelForm>({
      resolver: zodResolver(ModelSchema),
      defaultValues: {
        model: providerMeta.models[0].id,
        temperature: 0.3,
        maxTokens: 1024,
        timeoutMs: 30000,
        maxRetries: 3,
        cacheTtlSeconds: 3600,
        ...defaultValues,
      },
    });

  const selectedModel = watch('model');
  const temperature = watch('temperature');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-8">
      {/* Model selection */}
      <div className="space-y-3">
        <Label>Modelo</Label>
        {provider === 'custom' ? (
          <div className="space-y-1">
            <input
              {...register('model')}
              placeholder="ex: llama-3-70b-instruct"
              className={inputCls}
            />
            <FieldError message={errors.model?.message} />
          </div>
        ) : (
          <div className="space-y-2">
            {providerMeta.models.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setValue('model', m.id, { shouldValidate: true })}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all',
                    isSelected
                      ? 'border-blue-500/60 bg-blue-500/8'
                      : 'border-slate-800 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        isSelected ? 'bg-blue-400' : 'bg-slate-700',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-mono',
                        isSelected ? 'text-white' : 'text-slate-400',
                      )}
                    >
                      {m.id}
                    </span>
                    <span className="text-xs text-slate-600">{m.label}</span>
                  </div>
                  <span className="text-xs text-slate-600 font-mono">{m.context}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Parameter grid */}
      <div className="space-y-3">
        <Label>Parâmetros de geração</Label>
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-slate-500" />
                <Label>Temperatura</Label>
              </div>
              <span className="font-mono text-sm text-blue-400">
                {temperature.toFixed(1)}
              </span>
            </div>
            <Controller
              name="temperature"
              control={control}
              render={({ field }) => (
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={field.value}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
                />
              )}
            />
            <div className="flex justify-between text-[10px] text-slate-700 font-mono">
              <span>0.0 preciso</span>
              <span>1.0 balanceado</span>
              <span>2.0 criativo</span>
            </div>
            <Hint>
              Valores baixos (0.1–0.4) tornam a IA mais determinística e consistente — recomendado para extração de dados.
            </Hint>
          </div>

          {/* Max tokens */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-slate-600" />
              <Label>Max tokens</Label>
            </div>
            <input
              type="number"
              {...register('maxTokens', { valueAsNumber: true })}
              className={inputCls}
              min={256}
              max={8192}
              step={128}
            />
            <FieldError message={errors.maxTokens?.message} />
            <Hint>256–8192. Para JSON curto, 1024 é suficiente.</Hint>
          </div>

          {/* Timeout */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3 h-3 text-slate-600" />
              <Label>Timeout (ms)</Label>
            </div>
            <input
              type="number"
              {...register('timeoutMs', { valueAsNumber: true })}
              className={inputCls}
              min={5000}
              max={120000}
              step={1000}
            />
            <FieldError message={errors.timeoutMs?.message} />
            <Hint>Tempo máximo de espera por resposta. Padrão: 30000ms.</Hint>
          </div>

          {/* Retries */}
          <div className="space-y-1.5">
            <Label>Tentativas em falha</Label>
            <Controller
              name="maxRetries"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => field.onChange(n)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-mono border transition-all',
                        field.value === n
                          ? 'border-blue-500/60 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 text-slate-600 hover:border-slate-700',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Cache TTL */}
          <div className="space-y-1.5">
            <Label>Cache Redis (segundos)</Label>
            <input
              type="number"
              {...register('cacheTtlSeconds', { valueAsNumber: true })}
              className={inputCls}
              min={0}
              max={86400}
              step={300}
            />
            <FieldError message={errors.cacheTtlSeconds?.message} />
            <Hint>0 = desativado. 3600 = 1 hora. Mesmas mensagens retornam resposta em cache.</Hint>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — PROMPT
// ══════════════════════════════════════════════════════════════════════════════

function StepPrompt({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues: Partial<PromptForm>;
  onNext: (data: PromptForm) => void;
  onBack: () => void;
}) {
  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<PromptForm>({
      resolver: zodResolver(PromptSchema),
      defaultValues: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        truncateMaxMessages: 50,
        truncateMaxChars: 8000,
        ...defaultValues,
      },
    });

  const prompt = watch('systemPrompt') ?? '';
  const charCount = prompt.length;

  const VARIABLES = ['{phone}', '{messages}'];
  const REQUIRED_JSON_FIELDS = [
    'intent', 'sentiment', 'confidenceScore',
    'extractedFields', 'summary', 'missingFields', 'disqualifyReason',
  ];

  // highlight missing variables
  const missingVars = VARIABLES.filter((v) => !prompt.includes(v));
  const missingFields = REQUIRED_JSON_FIELDS.filter((f) => !prompt.includes(`"${f}"`));

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      {/* Variables reference bar */}
      <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
        <span className="text-xs text-slate-600 flex-shrink-0">Variáveis:</span>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <span
              key={v}
              className={cn(
                'px-2 py-0.5 rounded text-xs font-mono border',
                prompt.includes(v)
                  ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20'
                  : 'text-red-400 bg-red-500/8 border-red-500/20',
              )}
            >
              {v}
              {!prompt.includes(v) && ' ⚠'}
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <span
          className={cn(
            'text-xs font-mono',
            charCount > 7000 ? 'text-amber-400' : 'text-slate-600',
          )}
        >
          {charCount.toLocaleString()} / 16000
        </span>
      </div>

      {/* Editor */}
      <div className="space-y-1.5">
        <Label>Prompt do sistema</Label>
        <textarea
          {...register('systemPrompt')}
          rows={16}
          className={cn(
            inputCls,
            'resize-none text-xs leading-relaxed font-mono',
            errors.systemPrompt && 'border-red-500/50',
          )}
          spellCheck={false}
        />
        <FieldError message={errors.systemPrompt?.message} />
      </div>

      {/* Validation feedback */}
      {(missingVars.length > 0 || missingFields.length > 0) && (
        <div className="space-y-2">
          {missingVars.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Variáveis ausentes no prompt:{' '}
                <span className="font-mono">{missingVars.join(', ')}</span>
              </p>
            </div>
          )}
          {missingFields.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <Info className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Campos JSON não mencionados no prompt:{' '}
                <span className="font-mono">{missingFields.join(', ')}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Truncation controls */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Máximo de mensagens</Label>
          <input
            type="number"
            {...register('truncateMaxMessages', { valueAsNumber: true })}
            className={inputCls}
            min={1}
            max={100}
          />
          <Hint>Mensagens mais antigas são descartadas ao atingir o limite.</Hint>
        </div>
        <div className="space-y-1.5">
          <Label>Máximo de caracteres</Label>
          <input
            type="number"
            {...register('truncateMaxChars', { valueAsNumber: true })}
            className={inputCls}
            min={1000}
            max={16000}
            step={500}
          />
          <Hint>O texto das mensagens é truncado ao atingir o limite.</Hint>
        </div>
      </div>

      <StepNav onBack={onBack} />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — TRIGGERS
// ══════════════════════════════════════════════════════════════════════════════

function KeywordChipInput({
  label,
  hint,
  color,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  color: 'emerald' | 'red';
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  const remove = (kw: string) => onChange(value.filter((v) => v !== kw));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="min-h-[52px] p-2.5 bg-slate-950 border border-slate-700/60 rounded-lg flex flex-wrap gap-1.5">
        {value.map((kw) => (
          <span
            key={kw}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border',
              color === 'emerald'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400',
            )}
          >
            {kw}
            <button
              type="button"
              onClick={() => remove(kw)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-slate-700 self-center ml-1">
            Nenhuma palavra-chave adicionada
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Digite e pressione Enter"
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700/60 rounded-lg text-xs font-mono text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 rounded-lg transition-all disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}

function StepTriggers({
  defaultValues,
  onNext,
  onBack,
  isSaving,
}: {
  defaultValues: Partial<TriggerForm>;
  onNext: (data: TriggerForm) => void;
  onBack: () => void;
  isSaving: boolean;
}) {
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } =
    useForm<TriggerForm>({
      resolver: zodResolver(TriggerSchema),
      defaultValues: {
        qualificationKeywords: [],
        disqualificationKeywords: [],
        debounceMinutes: 3,
        confidenceThreshold: 0.6,
        requiredFields: ['name', 'plate'],
        ...defaultValues,
      },
    });

  const confidenceThreshold = watch('confidenceThreshold');
  const debounce = watch('debounceMinutes');
  const qualKw = watch('qualificationKeywords') ?? [];
  const disqualKw = watch('disqualificationKeywords') ?? [];
  const reqFields = watch('requiredFields') ?? [];

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-8">
      {/* Keywords */}
      <div className="grid grid-cols-1 gap-6">
        <Controller
          name="qualificationKeywords"
          control={control}
          render={({ field }) => (
            <KeywordChipInput
              label="Palavras-chave de qualificação"
              hint='Ex: "seguro", "cotação", "placa", "renovar". Lead que mencionar qualquer uma é priorizado.'
              color="emerald"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="disqualificationKeywords"
          control={control}
          render={({ field }) => (
            <KeywordChipInput
              label="Palavras-chave de desqualificação"
              hint='Ex: "cancelar", "errei", "spam". Lead que mencionar qualquer uma é desqualificado imediatamente.'
              color="red"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Numeric controls */}
      <div className="grid grid-cols-2 gap-6">
        {/* Debounce */}
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-500" />
              <Label>Janela de silêncio</Label>
            </div>
            <span className="font-mono text-sm text-blue-400">{debounce} min</span>
          </div>
          <Controller
            name="debounceMinutes"
            control={control}
            render={({ field }) => (
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
              />
            )}
          />
          <Hint>
            Tempo de inatividade após a última mensagem antes de acionar a análise da IA. Padrão: 3 minutos.
          </Hint>
        </div>

        {/* Confidence threshold */}
        <div className="space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-slate-500" />
              <Label>Confiança mínima da IA</Label>
            </div>
            <span
              className={cn(
                'font-mono text-sm',
                confidenceThreshold >= 0.8
                  ? 'text-emerald-400'
                  : confidenceThreshold >= 0.6
                    ? 'text-amber-400'
                    : 'text-red-400',
              )}
            >
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <Controller
            name="confidenceThreshold"
            control={control}
            render={({ field }) => (
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900"
              />
            )}
          />
          <Hint>
            Abaixo desse valor a IA marca o lead para revisão humana em vez de qualificar automaticamente.
          </Hint>
        </div>
      </div>

      {/* Required fields */}
      <div className="space-y-3">
        <Label>Campos obrigatórios para qualificação automática</Label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_REQUIRED_FIELDS.map((field) => {
            const active = reqFields.includes(field);
            return (
              <button
                key={field}
                type="button"
                onClick={() => {
                  if (active) {
                    setValue(
                      'requiredFields',
                      reqFields.filter((f) => f !== field),
                      { shouldValidate: true },
                    );
                  } else {
                    setValue('requiredFields', [...reqFields, field], {
                      shouldValidate: true,
                    });
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-mono border transition-all',
                  active
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-slate-950 border-slate-700/60 text-slate-500 hover:border-slate-600',
                )}
              >
                {active ? <Check className="w-3 h-3 inline mr-1" /> : null}
                {field}
              </button>
            );
          })}
        </div>
        {errors.requiredFields && (
          <FieldError message={errors.requiredFields.message} />
        )}
        <Hint>
          Um lead só avança para QUALIFICADO automaticamente quando todos esses campos estiverem preenchidos.
        </Hint>
      </div>

      {/* Save button (this step IS the final submit) */}
      <StepNav onBack={onBack} nextLabel="Salvar configuração" isLoading={isSaving} />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV BUTTONS
// ══════════════════════════════════════════════════════════════════════════════

function StepNav({
  canBack = true,
  onBack,
  nextLabel = 'Continuar',
  isLoading = false,
}: {
  canBack?: boolean;
  onBack: () => void;
  nextLabel?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
      {canBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl text-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      ) : (
        <div />
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {nextLabel}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUCCESS STATE
// ══════════════════════════════════════════════════════════════════════════════

function SuccessScreen({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Brain className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">IA configurada</h3>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          O sistema está pronto para processar leads automaticamente com as configurações salvas.
        </p>
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl text-sm transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        Editar configurações
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function AiConfig() {
  const { data: saved, isLoading } = useAiConfig();
  const saveConfig = useSaveAiConfig();

  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  // Accumulated draft across steps
  const [draft, setDraft] = useState<Partial<AiConfigDraft>>({});

  const markDone = (s: number) =>
    setCompleted((prev) => new Set([...prev, s]));

  const handleProviderNext = useCallback(
    (data: { provider: AiProvider; apiKey: string; baseUrl?: string }) => {
      setDraft((d) => ({ ...d, provider: data }));
      markDone(0);
      setStep(1);
    },
    [],
  );

  const handleModelNext = useCallback((data: {
    model: string; temperature: number; maxTokens: number;
    timeoutMs: number; maxRetries: number; cacheTtlSeconds: number;
  }) => {
    setDraft((d) => ({ ...d, model: data }));
    markDone(1);
    setStep(2);
  }, []);

  const handlePromptNext = useCallback((data: {
    systemPrompt: string; truncateMaxMessages: number; truncateMaxChars: number;
  }) => {
    setDraft((d) => ({
      ...d,
      prompt: { ...data, promptVersion: (saved?.prompt.promptVersion ?? 0) + 1 },
    }));
    markDone(2);
    setStep(3);
  }, [saved]);

  const handleTriggersNext = useCallback((data: {
    qualificationKeywords: string[]; disqualificationKeywords: string[];
    debounceMinutes: number; confidenceThreshold: number; requiredFields: string[];
  }) => {
    const final: AiConfigDraft = {
      provider: draft.provider!,
      model: draft.model!,
      prompt: draft.prompt!,
      triggers: data,
    };
    saveConfig.mutate(final, {
      onSuccess: () => {
        markDone(3);
        setDone(true);
      },
    });
  }, [draft, saveConfig]);

  // Pre-populate from saved config
  const providerDefaults = saved
    ? { provider: saved.provider.provider, apiKey: saved.provider.apiKey, baseUrl: saved.provider.baseUrl }
    : {};
  const modelDefaults = saved ? saved.model : {};
  const promptDefaults = saved ? saved.prompt : {};
  const triggerDefaults = saved ? saved.triggers : {};

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <Brain className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Configuração da IA
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Provedor · Modelo · Prompt · Gatilhos de qualificação
            </p>
          </div>
        </div>

        {/* Live status chip */}
        {saved?.isActive && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Ativa</span>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Step indicator */}
        {!done && (
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between flex-wrap gap-3">
            <StepIndicator
              current={step}
              completed={completed}
              onNavigate={setStep}
            />
            <span className="text-xs text-slate-600 font-mono">
              {step + 1} / {STEPS.length}
            </span>
          </div>
        )}

        <div className="p-6">
          {done ? (
            <SuccessScreen onEdit={() => { setDone(false); setStep(0); }} />
          ) : (
            <>
              {/* Step title */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const s = STEPS[step];
                    const Icon = s.icon;
                    return (
                      <>
                        <Icon className="w-4 h-4 text-blue-400" />
                        <h2 className="text-base font-semibold text-white">
                          {s.label}
                        </h2>
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-slate-600">
                  {step === 0 && 'Escolha o provedor de IA e informe a chave de acesso.'}
                  {step === 1 && 'Ajuste o modelo e os parâmetros de geração de texto.'}
                  {step === 2 && 'Defina o contexto e as instruções para o modelo.'}
                  {step === 3 && 'Configure os gatilhos que controlam o pipeline de qualificação.'}
                </p>
              </div>

              {/* Step forms */}
              {step === 0 && (
                <StepProvider
                  defaultValues={providerDefaults}
                  onNext={handleProviderNext}
                />
              )}
              {step === 1 && (
                <StepModel
                  defaultValues={modelDefaults}
                  provider={(draft.provider?.provider ?? saved?.provider.provider) || 'google'}
                  onNext={handleModelNext}
                  onBack={() => setStep(0)}
                />
              )}
              {step === 2 && (
                <StepPrompt
                  defaultValues={promptDefaults}
                  onNext={handlePromptNext}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <StepTriggers
                  defaultValues={triggerDefaults}
                  onNext={handleTriggersNext}
                  onBack={() => setStep(2)}
                  isSaving={saveConfig.isPending}
                />
              )}

              {/* Save error */}
              {saveConfig.isError && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-lg text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Erro ao salvar. Verifique sua conexão e tente novamente.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer note */}
      {!done && (
        <p className="text-center text-xs text-slate-700">
          As configurações entram em vigor imediatamente após salvas e se aplicam a todos os leads novos.
        </p>
      )}
    </div>
  );
}
