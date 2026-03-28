import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { WebhooksService } from './webhooks.service'
import { EvolutionWebhookSchema } from './dto/evolution-webhook.dto'

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name)

  constructor(private webhooksService: WebhooksService) {}

  @Public()
  @Post('evolution')
  @HttpCode(HttpStatus.OK)
  async handleEvolution(
    @Body() body: unknown,
    @Headers('x-hub-signature-256') _signature: string | undefined,
    @Headers('x-instance-name') _instance: string | undefined,
  ) {
    try {
      const parsed = EvolutionWebhookSchema.safeParse(body)
      if (!parsed.success) return { ok: true }

      const dto = parsed.data
      if (dto.event !== 'messages.upsert') return { ok: true }

      await this.webhooksService.handleMessage(dto)
    } catch (error) {
      this.logger.error('Erro ao processar webhook:', error)
    }
    return { ok: true }
  }
}
