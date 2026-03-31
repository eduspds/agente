# LeadWatch — Plataforma SaaS de Inteligência de Vendas

> Monitoramento passivo de WhatsApp com IA para qualificação automática de leads e atualização do CRM sem intervenção manual.

---

## Visão Geral

O LeadWatch **não é um chatbot**. Ele apenas **observa** conversas de WhatsApp, interpreta com IA e estrutura dados automaticamente no CRM.

**Objetivo:** Eliminar o preenchimento manual usando IA para:
- Estruturar dados de conversas em tempo real
- Classificar e qualificar leads automaticamente
- Atualizar o funil sem interação humana
- Gerar insights e prioridade por lead

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        LeadWatch Stack                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Baileys API] ──webhook──► [NestJS: WebhooksController]         │
│                                      │                           │
│                              HMAC validation                     │
│                              Idempotency check                   │
│                              Lead upsert                         │
│                                      │                           │
│                              [Redis: BullMQ Queue]               │
│                              ┌───────┴──────────┐               │
│                         debounce (3min)    DLQ (failed)         │
│                                      │                           │
│                         [Worker: MessageProcessor]               │
│                              │              │                    │
│                    [AiService]         [PipelineService]         │
│                    + Redis cache       + FunnelRules             │
│                    + Zod validation    + PriorityScore           │
│                    + Retry 3x          + AuditLog                │
│                              │                                   │
│                     [PostgreSQL via Prisma]                      │
│                              │                                   │
│                    [Socket.io: DashboardGateway]                 │
│                              │                                   │
│                    [React: Dashboard em tempo real]              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + TanStack Query v5 |
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL 16 + Prisma ORM |
| Fila | Redis + BullMQ |
| Realtime | Socket.io |
| IA | OpenAI-compatible API (gpt-4o-mini) |
| DevOps | Docker + Docker Compose + Nginx |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20
- [Docker](https://www.docker.com/) >= 24 e Docker Compose
- Uma chave de API OpenAI (ou API compatível)

---

## Setup Local

### 1. Clone e configure variáveis de ambiente

```bash
git clone <repo>
cd leadwatch

# Backend
cp backend/.env.example backend/.env
# Edite backend/.env com suas configurações

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Suba a infraestrutura (banco + Redis)

```bash
docker compose up postgres redis -d
```

### 3. Backend

```bash
cd backend
npm install

# Gera o Prisma Client
npx prisma generate

# Roda migrations
npx prisma migrate deploy

# Seed de desenvolvimento (1 tenant + 2 usuários)
npm run prisma:seed

# Inicia em modo dev
npm run start:dev
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

**Credenciais do seed:**
- Admin: `admin@leadwatch.com` / `Admin@123`
- Agente: `agente@leadwatch.com` / `Agent@123`

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_HOST` | Host do Redis | ✅ |
| `JWT_SECRET` | Segredo do access token (min 32 chars) | ✅ |
| `JWT_REFRESH_SECRET` | Segredo do refresh token | ✅ |
| `AI_API_KEY` | Chave da API de IA | ✅ |
| `AI_MODEL` | Modelo (ex: gpt-4o-mini) | ✅ |
| `BAILEYS_WEBHOOK_SECRET` | HMAC secret para validar webhooks | ✅ |
| `AI_CONFIDENCE_THRESHOLD` | Threshold mínimo de confiança (0.6) | ❌ |
| `QUEUE_DEBOUNCE_MS` | Delay da janela de silêncio (180000) | ❌ |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL da API REST |
| `VITE_WS_URL` | URL do WebSocket |

---

## Como Rodar Testes

```bash
cd backend

# Testes unitários
npm test

# Com coverage
npm run test:cov

# Testes E2E (requer banco rodando)
npm run test:e2e
```

---

## Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Renovar token |
| GET | `/api/v1/leads` | Listar leads (paginado) |
| GET | `/api/v1/leads/:id` | Detalhe do lead |
| PATCH | `/api/v1/leads/:id` | Editar lead |
| POST | `/api/v1/leads/:id/reprocess` | Reprocessar com IA |
| GET | `/api/v1/leads/:id/history` | Histórico completo |
| GET | `/api/v1/dashboard/stats` | Estatísticas |
| POST | `/api/v1/webhooks/baileys` | Receber eventos |
| GET | `/api/v1/debug/leads/:id/ai-payload` | Debug IA (ADMIN) |
| GET | `/api/v1/settings` | Configurações tenant |
| PATCH | `/api/v1/settings` | Atualizar configurações |

**Swagger UI:** http://localhost:3000/api/v1/docs

---

## Deploy com Docker

```bash
# Produção
cp backend/.env.example .env
# Preencha todas as variáveis obrigatórias

docker compose -f docker-compose.prod.yml up -d
```

---

## Decisões Arquiteturais

### 1. Debounce com BullMQ (janela de silêncio)
Mensagens em sequência rápida são agrupadas antes de serem enviadas para IA. Cada nova mensagem dentro da janela de 3 minutos cancela e reagenda o job anterior, garantindo que a IA receba o contexto completo de uma "conversa" e não mensagens isoladas. Isso reduz custo de API e melhora a qualidade da análise.

### 2. Idempotência em dois níveis
- **messageId único** no banco impede mensagens duplicadas de webhooks
- **jobId determinístico** (`tenantId:chatId`) no BullMQ impede jobs duplicados

### 3. Soberania Humana
Campos editados manualmente ficam protegidos no array `humanOverrideFields`. O sistema de IA nunca sobrescreve dados editados por humanos, mesmo em reprocessamentos.

### 4. Tratamento de LID (Baileys v6.8+)
O WhatsApp pode enviar identificadores opacos (`@lid`) em vez de números de telefone. O sistema detecta LIDs, armazena o chatId interno para roteamento, mas **nunca persiste ou expõe LIDs no frontend** — apenas números reais no formato `55XXXXXXXXXX`.

### 5. Multi-tenancy
Toda query ao banco inclui `tenantId` no `WHERE`. O `TenantGuard` extrai e valida o tenant do JWT em todas as rotas autenticadas, garantindo isolamento de dados entre clientes.

### 6. Cache de IA no Redis
Respostas da IA são cacheadas por 1 hora com chave derivada do hash SHA-256 do prompt. Isso evita chamadas duplicadas para a mesma conversa e reduz custo significativamente em reprocessamentos.
