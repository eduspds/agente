import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LeadStatus, Sentiment } from '../types/models';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) {
    // +55 (11) 99999-9999
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return phone;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr));
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return formatDate(dateStr);
}

export function isRecent(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NOVO: 'Novo',
  EM_QUALIFICACAO: 'Em Qualificação',
  QUALIFICADO: 'Qualificado',
  DESQUALIFICADO: 'Desqualificado',
  ESPECIALISTA: 'Especialista',
  PENDENTE_IDENTIFICACAO: 'Pendente',
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  NOVO: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  EM_QUALIFICACAO: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  QUALIFICADO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  DESQUALIFICADO: 'bg-red-500/20 text-red-300 border-red-500/30',
  ESPECIALISTA: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  PENDENTE_IDENTIFICACAO: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  POSITIVO: 'text-emerald-400',
  NEUTRO: 'text-slate-400',
  NEGATIVO: 'text-red-400',
};

export const SENTIMENT_ICONS: Record<Sentiment, string> = {
  POSITIVO: '↑',
  NEUTRO: '→',
  NEGATIVO: '↓',
};
