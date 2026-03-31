import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { MessageProducer } from '../queues/message.producer';
import {
  BaileysUpsertPayload,
  extractMessageBody,
  resolvePhoneFromJid,
} from './dto/evolution-webhook.dto';
import { LeadStatus } from '@prisma/client';

export interface WebhookProcessResult {
  leadId: string;
  messageId: string;
  isDuplicate: boolean;
  chatId: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: MessagesService,
    private readonly messageProducer: MessageProducer,
  ) {}

  async processUpsert(
    tenantId: string,
    payload: BaileysUpsertPayload,
  ): Promise<WebhookProcessResult> {
    const { key, message, messageTimestamp, pushName } = payload.data;

    // ─── Resolução de phone (Regra Crítica 7.1) ────────────────────────────
    const { phone, chatId } = resolvePhoneFromJid(
      key.remoteJid,
      key.remoteJidAlt,
    );

    const messageBody = extractMessageBody(message);
    const timestamp = new Date(Number(messageTimestamp) * 1000);
    const messageId = key.id;

    // ─── Idempotência: verificar messageId antes de qualquer operação ──────
    const existingMsg = await this.prisma.message.findUnique({
      where: { messageId },
    });

    if (existingMsg) {
      this.logger.debug(`Mensagem duplicada ignorada: ${messageId}`);
      return {
        leadId: existingMsg.leadId,
        messageId,
        isDuplicate: true,
        chatId,
      };
    }

    // ─── Upsert do Lead ────────────────────────────────────────────────────
    const leadStatus: LeadStatus =
      phone === null
        ? LeadStatus.PENDENTE_IDENTIFICACAO
        : LeadStatus.NOVO;

    const lead = await this.prisma.lead.upsert({
      where: {
        tenantId_chatId: { tenantId, chatId },
      },
      create: {
        tenantId,
        chatId,
        phone: phone ?? undefined,
        name: pushName ?? undefined,
        status: leadStatus,
        lastMessageAt: timestamp,
      },
      update: {
        lastMessageAt: timestamp,
        // Atualiza phone se antes era null (LID resolvido)
        ...(phone !== null && { phone }),
        // Atualiza nome apenas se ainda não foi sobrescrito por IA ou humano
        ...(pushName !== undefined && {
          name: pushName,
        }),
        // Promove status PENDENTE_IDENTIFICACAO → NOVO quando o phone é resolvido
        ...(phone !== null && {
          status: {
            // Usa set condicional — não sobrescreve status avançados
          },
        }),
      },
    });

    // Corrige transição PENDENTE → NOVO se phone foi resolvido após LID
    if (
      phone !== null &&
      lead.status === LeadStatus.PENDENTE_IDENTIFICACAO
    ) {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.NOVO, phone },
      });
    }

    // ─── Persistência da mensagem ──────────────────────────────────────────
    const { message: savedMessage } =
      await this.messagesService.createIfNotExists({
        tenantId,
        leadId: lead.id,
        messageId,
        chatId,
        fromMe: key.fromMe,
        body: messageBody,
        timestamp,
      });

    this.logger.log(
      `Mensagem capturada: leadId=${lead.id} chatId=${chatId} msgId=${messageId}`,
    );

    // ─── Agenda processamento com debounce (seção 9.1) ─────────────────────
    await this.messageProducer.scheduleProcessing(tenantId, chatId, lead.id);

    return {
      leadId: lead.id,
      messageId: savedMessage.messageId,
      isDuplicate: false,
      chatId,
    };
  }
}
