import { LeadStatus } from '@prisma/client';

// ─── Regras de transição do funil (seção 9.3) ─────────────────────────────────

export interface TransitionResult {
  newStatus: LeadStatus;
  reason: string;
  shouldContinue: boolean; // false = encerrar pipeline
}

export interface FunnelContext {
  currentStatus: LeadStatus;
  intent: string;
  disqualifyReason: string | null;
  confidenceScore: number;
  requiredFields: string[];
  extractedFields: Record<string, string | null>;
  confidenceThreshold: number;
}

export function evaluateFunnelTransition(
  ctx: FunnelContext,
): TransitionResult {
  const {
    currentStatus,
    intent,
    disqualifyReason,
    confidenceScore,
    requiredFields,
    extractedFields,
    confidenceThreshold,
  } = ctx;

  // ─── Classificação por intenção ──────────────────────────────────────────
  if (intent === 'SOCIAL') {
    return {
      newStatus: LeadStatus.DESQUALIFICADO,
      reason: 'Conversa social — fora do escopo de negociação',
      shouldContinue: false,
    };
  }

  if (intent === 'SUPORTE') {
    return {
      newStatus: LeadStatus.DESQUALIFICADO,
      reason: 'Solicitação de suporte — encaminhado para equipe técnica',
      shouldContinue: false,
    };
  }

  // ─── Desqualificação explícita pela IA ───────────────────────────────────
  if (disqualifyReason !== null && disqualifyReason.trim() !== '') {
    return {
      newStatus: LeadStatus.DESQUALIFICADO,
      reason: disqualifyReason,
      shouldContinue: false,
    };
  }

  // ─── Confiança insuficiente — mantém em qualificação com flag de revisão ─
  if (confidenceScore < confidenceThreshold) {
    return {
      newStatus: LeadStatus.EM_QUALIFICACAO,
      reason: `Confiança abaixo do threshold (${confidenceScore.toFixed(2)} < ${confidenceThreshold})`,
      shouldContinue: true,
    };
  }

  // ─── Verificação de campos obrigatórios ───────────────────────────────────
  const allRequiredFieldsFilled = requiredFields.every(
    (field) =>
      extractedFields[field] !== null &&
      extractedFields[field] !== undefined &&
      extractedFields[field] !== '',
  );

  if (intent === 'NEGOCIACAO' && allRequiredFieldsFilled) {
    return {
      newStatus: LeadStatus.QUALIFICADO,
      reason: 'Intent de negociação com todos os campos obrigatórios preenchidos',
      shouldContinue: true,
    };
  }

  // ─── Transição para qualificação (campos ainda incompletos) ─────────────
  return {
    newStatus: LeadStatus.EM_QUALIFICACAO,
    reason: `Campos obrigatórios pendentes: ${requiredFields
      .filter(
        (f) =>
          !extractedFields[f] ||
          extractedFields[f] === null,
      )
      .join(', ')}`,
    shouldContinue: true,
  };
}

// ─── Cálculo de priorityScore (seção 9.4) ─────────────────────────────────────

export interface PriorityScoreContext {
  lastMessageAt: Date | null;
  status: LeadStatus;
  extractedFields: Record<string, string | null>;
  requiredFields: string[];
  sentiment: string;
}

const STATUS_WEIGHTS: Record<LeadStatus, number> = {
  [LeadStatus.QUALIFICADO]: 30,
  [LeadStatus.EM_QUALIFICACAO]: 20,
  [LeadStatus.NOVO]: 10,
  [LeadStatus.ESPECIALISTA]: 25,
  [LeadStatus.DESQUALIFICADO]: 0,
  [LeadStatus.PENDENTE_IDENTIFICACAO]: 5,
};

export function calculatePriorityScore(ctx: PriorityScoreContext): number {
  const { lastMessageAt, status, extractedFields, requiredFields, sentiment } =
    ctx;

  const isRecent =
    lastMessageAt !== null &&
    Date.now() - lastMessageAt.getTime() < 24 * 60 * 60 * 1000;

  const hasAllFields = requiredFields.every(
    (f) => extractedFields[f] !== null && extractedFields[f] !== undefined,
  );

  const score =
    (isRecent ? 40 : 0) +
    (STATUS_WEIGHTS[status] ?? 0) +
    (hasAllFields ? 20 : 0) +
    (sentiment === 'POSITIVO' ? 10 : 0);

  return Math.min(score / 100, 1.0);
}
