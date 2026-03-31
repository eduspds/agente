// ─── Modelos de domínio do frontend ──────────────────────────────────────────
// chatId NUNCA incluído (regra crítica 7.1)

export type LeadStatus =
  | 'NOVO'
  | 'EM_QUALIFICACAO'
  | 'QUALIFICADO'
  | 'DESQUALIFICADO'
  | 'ESPECIALISTA'
  | 'PENDENTE_IDENTIFICACAO';

export type Intent = 'NEGOCIACAO' | 'SUPORTE' | 'SOCIAL';
export type Sentiment = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';
export type Role = 'ADMIN' | 'AGENT' | 'VIEWER';
export type Source = 'AI' | 'HUMAN' | 'SYSTEM';

export interface Lead {
  id: string;
  phone: string | null;
  name: string | null;
  plate: string | null;
  email: string | null;
  status: LeadStatus;
  intent: Intent | null;
  sentiment: Sentiment | null;
  confidenceScore: number | null;
  priorityScore: number | null;
  needsHumanReview: boolean;
  summary: string | null;
  missingFields: string[];
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithMessages extends Lead {
  messages: Message[];
}

export interface Message {
  id: string;
  fromMe: boolean;
  body: string;
  timestamp: string;
  processed: boolean;
}

/** Mensagem na listagem paginada GET /leads/:id/messages */
export interface MessageItem {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: string;
  processed: boolean;
}

/** Última análise de IA devolvida junto às mensagens */
export interface AiInsight {
  id: string;
  intent: Intent;
  sentiment: Sentiment;
  confidenceScore: number;
  extractedFields: {
    name: string | null;
    plate: string | null;
    email: string | null;
  };
  summary: string;
  missingFields: string[];
  promptVersion: number;
  createdAt: string;
}

export interface MessagesResponse {
  data: MessageItem[];
  nextCursor: string | null;
  total: number;
  latestAnalysis: AiInsight | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AuditLog {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  source: Source;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'email'> | null;
}

export interface FunnelEvent {
  id: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  reason: string | null;
  triggeredBy: string;
  createdAt: string;
}

export interface AiAnalysis {
  id: string;
  intent: string;
  sentiment: string;
  confidenceScore: number;
  extractedFields: Record<string, string | null>;
  promptVersion: number;
  cacheHit: boolean;
  tokensUsed: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface LeadHistory {
  auditLogs: AuditLog[];
  funnelEvents: FunnelEvent[];
  aiAnalyses: AiAnalysis[];
}

export interface DashboardStats {
  totalActive: number;
  statusCounts: Record<LeadStatus, number>;
  recentLeadsCount: number;
  needsHumanReviewCount: number;
  topPriorityLeads: Partial<Lead>[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: string | null;
    total: number;
  };
}
