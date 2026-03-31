import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import {
  resolvePhoneFromJid,
  extractMessageBody,
} from './dto/evolution-webhook.dto';

// ─── Mock do WebhooksService ──────────────────────────────────────────────────

const mockWebhooksService = {
  processUpsert: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'baileys.webhookSecret': 'change_me_in_production_webhook_secret',
      'app.nodeEnv': 'test',
    };
    return map[key];
  }),
};

// ─── Testes de resolução de phone (Regra Crítica 7.1) ────────────────────────

describe('resolvePhoneFromJid', () => {
  it('deve extrair phone de remoteJid no formato PN', () => {
    const { phone, chatId } = resolvePhoneFromJid(
      '5511999999999@s.whatsapp.net',
    );
    expect(phone).toBe('5511999999999');
    expect(chatId).toBe('5511999999999@s.whatsapp.net');
  });

  it('deve preferir remoteJidAlt quando remoteJid é LID', () => {
    const { phone, chatId } = resolvePhoneFromJid(
      '221800818593797@lid',
      '5511987654321@s.whatsapp.net',
    );
    expect(phone).toBe('5511987654321');
    expect(chatId).toBe('221800818593797@lid'); // chatId mantém o LID original
  });

  it('deve retornar phone=null quando remoteJid é LID sem alternativo', () => {
    const { phone, chatId } = resolvePhoneFromJid('221800818593797@lid');
    expect(phone).toBeNull();
    expect(chatId).toBe('221800818593797@lid');
  });

  it('deve aceitar formato @c.us', () => {
    const { phone } = resolvePhoneFromJid('5511999999999@c.us');
    expect(phone).toBe('5511999999999');
  });
});

// ─── Testes de extração de body da mensagem ───────────────────────────────────

describe('extractMessageBody', () => {
  it('deve extrair texto de conversation', () => {
    const body = extractMessageBody({ conversation: 'Olá, quero seguro' });
    expect(body).toBe('Olá, quero seguro');
  });

  it('deve extrair texto de extendedTextMessage', () => {
    const body = extractMessageBody({
      extendedTextMessage: { text: 'Mensagem longa com formatação' },
    });
    expect(body).toBe('Mensagem longa com formatação');
  });

  it('deve retornar placeholder para mensagem de áudio', () => {
    const body = extractMessageBody({ audioMessage: {} });
    expect(body).toBe('[Mensagem de áudio]');
  });

  it('deve retornar placeholder para conteúdo não suportado', () => {
    const body = extractMessageBody({});
    expect(body).toBe('[Conteúdo não suportado]');
  });
});

// ─── Testes do WebhooksController ─────────────────────────────────────────────

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  it('deve retornar { ok: true } mesmo sem tenantId', async () => {
    const result = await controller.handleWebhook(
      {},
      undefined,
      undefined,
      { rawBody: undefined } as never,
    );
    expect(result).toEqual({ ok: true });
    expect(mockWebhooksService.processUpsert).not.toHaveBeenCalled();
  });

  it('deve ignorar eventos que não são messages.upsert', async () => {
    const result = await controller.handleWebhook(
      { event: 'connection.update', data: {} },
      'valid-sig',
      'tenant-1',
      { rawBody: Buffer.from('{}') } as never,
    );
    expect(result).toEqual({ ok: true });
    expect(mockWebhooksService.processUpsert).not.toHaveBeenCalled();
  });

  it('deve processar evento messages.upsert válido', async () => {
    mockWebhooksService.processUpsert.mockResolvedValue({
      leadId: 'lead-1',
      messageId: 'msg-1',
      isDuplicate: false,
      chatId: '5511999999999@s.whatsapp.net',
    });

    const payload = {
      event: 'messages.upsert',
      instance: 'test-instance',
      data: {
        key: {
          remoteJid: '5511999999999@s.whatsapp.net',
          fromMe: false,
          id: 'ABCDEF123456',
        },
        message: { conversation: 'Olá, quero seguro' },
        messageTimestamp: 1718000000,
        pushName: 'João Silva',
      },
    };

    const result = await controller.handleWebhook(
      payload,
      'valid-sig',
      'tenant-1',
      { rawBody: Buffer.from(JSON.stringify(payload)) } as never,
    );

    expect(result).toEqual({ ok: true });
    expect(mockWebhooksService.processUpsert).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ event: 'messages.upsert' }),
    );
  });

  it('deve retornar { ok: true } mesmo quando processUpsert lança erro', async () => {
    mockWebhooksService.processUpsert.mockRejectedValue(
      new Error('Erro interno'),
    );

    const payload = {
      event: 'messages.upsert',
      instance: 'test',
      data: {
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'ID' },
        message: { conversation: 'Teste' },
        messageTimestamp: 1718000000,
      },
    };

    const result = await controller.handleWebhook(
      payload,
      'any',
      'tenant-1',
      { rawBody: Buffer.from('{}') } as never,
    );

    expect(result).toEqual({ ok: true });
  });
});
