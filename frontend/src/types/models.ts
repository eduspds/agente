export type LeadStatus =
  | 'NOVO'
  | 'EM_QUALIFICACAO'
  | 'QUALIFICADO'
  | 'DESQUALIFICADO'
  | 'ESPECIALISTA'

export interface Lead {
  id: string
  chatId: string
  phone: string
  name: string | null
  plate: string | null
  email: string | null
  status: LeadStatus
  intent: string | null
  sentiment: string | null
  confidenceScore: number | null
  priorityScore: number | null
  needsHumanReview: boolean
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadsListResponse {
  items: Lead[]
  nextCursor?: string
}

export interface DashboardStats {
  totalLeads: number
  byStatus: Record<string, number>
  messages24h: number
  recent: Array<{
    id: string
    chatId: string
    phone: string
    name: string | null
    status: LeadStatus
    lastMessageAt: string | null
    needsHumanReview: boolean
  }>
}

export interface ConversationRow {
  id: string
  chatId: string
  phone: string
  name: string | null
  status: LeadStatus
  lastMessageAt: string | null
  needsHumanReview: boolean
  messages: Array<{
    id: string
    body: string
    fromMe: boolean
    timestamp: string
  }>
}

export interface ConversationDetail {
  lead: {
    id: string
    chatId: string
    phone: string
    name: string | null
    plate: string | null
    email: string | null
    status: LeadStatus
    intent: string | null
    sentiment: string | null
    confidenceScore: number | null
    needsHumanReview: boolean
    lastMessageAt: string | null
  }
  messages: Array<{
    id: string
    messageId: string
    fromMe: boolean
    body: string
    timestamp: string
    processed: boolean
  }>
}

export interface UserRow {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'AGENT'
  active: boolean
  createdAt: string
  updatedAt: string
}
