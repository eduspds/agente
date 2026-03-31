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
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ ok: boolean }> {
    if (!this.verifyHmacSignature(req.rawBody, signature)) {
      this.logger.warn('Assinatura HMAC inválida — ignorado');
      return { ok: true };
    }

    const baseResult = BaileysWebhookSchema.safeParse(body);
    if (!baseResult.success) {
      this.logger.warn('Payload de webhook malformado — ignorado');
      return { ok: true };
    }

    if (baseResult.data.event !== 'messages.upsert') {
      this.logger.debug(
        `Evento ${baseResult.data.event} ignorado (apenas messages.upsert)`,
      );
      return { ok: true };
    }

    const upsertResult = BaileysUpsertPayloadSchema.safeParse(body);
    if (!upsertResult.success) {
      this.logger.warn(
        `Payload messages.upsert inválido: ${upsertResult.error.message}`,
      );
      return { ok: true };
    }

    try {
      await this.webhooksService.processUpsert(upsertResult.data);
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error);
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
