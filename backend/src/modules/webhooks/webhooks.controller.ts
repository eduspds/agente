import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import * as crypto from 'crypto';
import { WebhooksService } from './webhooks.service';
import {
  BaileysUpsertPayloadSchema,
  BaileysWebhookSchema,
} from './dto/evolution-webhook.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  // Webhook é público — autenticado via HMAC, não JWT
  @Public()
  @Post('baileys')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receber eventos da baileys API',
    description:
      'Endpoint público autenticado via HMAC-SHA256. Processa apenas eventos messages.upsert.',
  })
  @ApiResponse({ status: 200, description: 'Evento processado ou ignorado' })
  async handleWebhook(
    @Body() body: unknown,
    @Headers('x-baileys-signature') signature: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ ok: boolean }> {
    // ─── Validação do tenantId ─────────────────────────────────────────────
    if (!tenantId) {
      this.logger.warn('Webhook recebido sem X-Tenant-ID — ignorado');
      // Retorna 200 para não expor informação ao caller externo
      return { ok: true };
    }

    // ─── Validação de assinatura HMAC ─────────────────────────────────────
    if (!this.verifyHmacSignature(req.rawBody, signature)) {
      this.logger.warn(
        `Assinatura HMAC inválida para tenant=${tenantId}`,
      );
      return { ok: true };
    }

    // ─── Parse do payload base ────────────────────────────────────────────
    const baseResult = BaileysWebhookSchema.safeParse(body);
    if (!baseResult.success) {
      this.logger.warn('Payload de webhook malformado — ignorado');
      return { ok: true };
    }

    // ─── Filtro de evento ─────────────────────────────────────────────────
    if (baseResult.data.event !== 'messages.upsert') {
      this.logger.debug(
        `Evento ${baseResult.data.event} ignorado (apenas messages.upsert)`,
      );
      return { ok: true };
    }

    // ─── Validação estrita do payload messages.upsert ─────────────────────
    const upsertResult = BaileysUpsertPayloadSchema.safeParse(body);
    if (!upsertResult.success) {
      this.logger.warn(
        `Payload messages.upsert inválido: ${upsertResult.error.message}`,
      );
      return { ok: true };
    }

    try {
      await this.webhooksService.processUpsert(tenantId, upsertResult.data);
    } catch (error) {
      // Nunca expor erros internos ao caller do webhook
      this.logger.error(
        `Erro ao processar webhook para tenant=${tenantId}`,
        error,
      );
    }

    return { ok: true };
  }

  private verifyHmacSignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): boolean {
    const webhookSecret = this.configService.get<string>(
      'baileys.webhookSecret',
    );

    // Se não há segredo configurado em dev, permite passar
    if (!webhookSecret || webhookSecret === 'change_me_in_production_webhook_secret') {
      if (process.env.NODE_ENV !== 'production') return true;
      this.logger.error('BAILEYS_WEBHOOK_SECRET não configurado em produção!');
      return false;
    }

    if (!signature || !rawBody) return false;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Comparação em tempo constante para prevenir timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }
}
