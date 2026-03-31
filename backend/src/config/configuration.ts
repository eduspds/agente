import { registerAs } from '@nestjs/config';

// ─── Tipos tipados para cada namespace de configuração ───────────────────────

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string | undefined;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface AiConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxTokens: number;
  confidenceThreshold: number;
}

export interface QueueConfig {
  debounceMs: number;
  maxRetries: number;
  backoffMs: number;
}

export interface BaileysConfig {
  webhookSecret: string;
  /** URL POST opcional do sidecar Baileys para envio ({ instance, to, text }). */
  messageProxyUrl?: string;
  /** Bearer opcional para o proxy de envio. */
  messageProxySecret?: string;
  /** Nome de instância padrão ao criar a linha única no banco. */
  defaultInstanceName: string;
}

// ─── Registros de configuração por namespace ─────────────────────────────────

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  }),
);

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: requireEnv('DATABASE_URL'),
  }),
);

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  }),
);

export const jwtConfig = registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  }),
);

export const aiConfig = registerAs(
  'ai',
  (): AiConfig => ({
    provider: process.env.AI_PROVIDER ?? 'openai',
    apiKey: requireEnv('AI_API_KEY'),
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    baseUrl:
      process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? '30000', 10),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1000', 10),
    confidenceThreshold: parseFloat(
      process.env.AI_CONFIDENCE_THRESHOLD ?? '0.6',
    ),
  }),
);

export const queueConfig = registerAs(
  'queue',
  (): QueueConfig => ({
    debounceMs: parseInt(process.env.QUEUE_DEBOUNCE_MS ?? '180000', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES ?? '3', 10),
    backoffMs: parseInt(process.env.QUEUE_BACKOFF_MS ?? '5000', 10),
  }),
);

export const baileysConfig = registerAs(
  'baileys',
  (): BaileysConfig => ({
    webhookSecret: requireEnv('BAILEYS_WEBHOOK_SECRET'),
    messageProxyUrl: process.env.BAILEYS_MESSAGE_URL?.trim() || undefined,
    messageProxySecret: process.env.BAILEYS_MESSAGE_SECRET?.trim() || undefined,
    defaultInstanceName:
      process.env.BAILEYS_DEFAULT_INSTANCE?.trim() || 'leadwatch',
  }),
);

// ─── Helper: lança erro em startup se variável obrigatória estiver ausente ───

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Config] Variável de ambiente obrigatória não definida: ${key}`,
    );
  }
  return value;
}

// ─── Export agregado para uso no ConfigModule ─────────────────────────────────

export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  aiConfig,
  queueConfig,
  baileysConfig,
];
