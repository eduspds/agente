import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import {
  ConfigureWhatsAppSessionSchema,
  SendWhatsAppMessageSchema,
} from './dto/whatsapp.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('whatsapp')
@ApiBearerAuth('access-token')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('session')
  @ApiOperation({
    summary: 'Estado completo da sessão WhatsApp global (inclui QR quando disponível)',
  })
  async getSession() {
    return this.whatsappService.getSession();
  }

  @Get('status')
  @ApiOperation({ summary: 'Status resumido da sessão global' })
  async getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('qr')
  @ApiOperation({ summary: 'QR Code e status da sessão global' })
  async getQr() {
    return this.whatsappService.getQr();
  }

  @Post('session')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Configurar nome e/ou instanceName da sessão global (apenas ADMIN)',
  })
  async configureSession(@Body() body: unknown) {
    const parsed = ConfigureWhatsAppSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.whatsappService.configure(parsed.data);
  }

  @Post('reconnect')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Solicitar novo QR / reconexão (apenas ADMIN)' })
  async reconnect() {
    return this.whatsappService.reconnect();
  }

  @Delete('session')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Resetar estado da sessão no LeadWatch (apenas ADMIN)',
  })
  async resetSession() {
    return this.whatsappService.resetSession();
  }

  @Post('send')
  @Roles('ADMIN', 'AGENT')
  @ApiOperation({
    summary:
      'Enviar mensagem pela instância global (requer BAILEYS_MESSAGE_URL)',
  })
  async send(@Body() body: unknown) {
    const parsed = SendWhatsAppMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.whatsappService.sendMessage(parsed.data);
  }
}
