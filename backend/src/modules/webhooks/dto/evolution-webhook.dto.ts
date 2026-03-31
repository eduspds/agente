import { z } from 'zod';

// ─── Schema Zod do payload Baileys API ────────────────────────────────────────
// Ref: seção 7 do spec — tratamento de LID implementado no processamento

const MessageKeySchema = z.object({
  remoteJid: z.string().min(1),
  // Campo alternativo presente no Baileys v6.8+ quando remoteJid é LID
  remoteJidAlt: z.string().optional(),
  fromMe: z.boolean(),
  id: z.string().min(1),
});

const MessageContentSchema = z.object({
  // Texto simples
  conversation: z.string().optional(),
  // Mensagem com mídia (imagem, vídeo, doc)
  imageMessage: z.object({ caption: z.string().optional() }).optional(),
  videoMessage: z.object({ caption: z.string().optional() }).optional(),
  documentMessage: z.object({ caption: z.string().optional() }).optional(),
  // Mensagem de áudio/voz (sem corpo de texto)
  audioMessage: z.object({}).optional(),
  // Resposta a outra mensagem
  extendedTextMessage: z
    .object({ text: z.string().optional() })
    .optional(),
});

export const BaileysUpsertPayloadSchema = z.object({
  event: z.literal('messages.upsert'),
  instance: z.string().min(1),
  data: z.object({
    key: MessageKeySchema,
    message: MessageContentSchema,
    messageTimestamp: z.union([z.number(), z.string()]),
    pushName: z.string().optional(),
    // Instância do Baileys que originou a mensagem (multi-device)
    instanceName: z.string().optional(),
  }),
});

// Aceita qualquer evento mas só processa messages.upsert
export const BaileysWebhookSchema = z.object({
  event: z.string(),
  instance: z.string().optional(),
  data: z.unknown().optional(),
});

export type BaileysUpsertPayload = z.infer<typeof BaileysUpsertPayloadSchema>;
export type BaileysWebhookPayload = z.infer<typeof BaileysWebhookSchema>;

// ─── Helper: extração segura do corpo da mensagem ─────────────────────────────

export function extractMessageBody(
  message: z.infer<typeof MessageContentSchema>,
): string {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.audioMessage) return '[Mensagem de áudio]';
  return '[Conteúdo não suportado]';
}

// ─── Helper: resolução de phone a partir do JID (Regra Crítica seção 7.1) ────

export function resolvePhoneFromJid(
  remoteJid: string,
  remoteJidAlt?: string,
): { phone: string | null; chatId: string } {
  const chatId = remoteJid;

  // 1. Preferir remoteJidAlt se disponível e for formato PN
  if (remoteJidAlt && isPnJid(remoteJidAlt)) {
    return { phone: extractPhone(remoteJidAlt), chatId };
  }

  // 2. Se remoteJid for formato PN, usar diretamente
  if (isPnJid(remoteJid)) {
    return { phone: extractPhone(remoteJid), chatId };
  }

  // 3. remoteJid é LID — phone não resolvível neste momento
  // O lead será criado com status PENDENTE_IDENTIFICACAO
  return { phone: null, chatId };
}

function isPnJid(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us');
}

function extractPhone(jid: string): string {
  // Remove sufixo @s.whatsapp.net ou @c.us
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
}
