export const configuration = () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  ai: {
    provider: process.env.AI_PROVIDER ?? 'openai',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? '30000', 10),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS ?? '1000', 10),
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD ?? '0.6'),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '3', 10),
  },
  queue: {
    debounceMs: parseInt(process.env.QUEUE_DEBOUNCE_MS ?? '180000', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES ?? '3', 10),
    backoffMs: parseInt(process.env.QUEUE_BACKOFF_MS ?? '5000', 10),
  },
  webhook: {
    evolutionSecret: process.env.EVOLUTION_WEBHOOK_SECRET ?? '',
  },
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL ?? 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY ?? '',
  },
})

export type AppConfig = ReturnType<typeof configuration>
