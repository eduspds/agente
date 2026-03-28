import { Controller, Get, Post, Req } from '@nestjs/common'
import { Request } from 'express'
import { User, Role } from '@prisma/client'
import { WhatsappService } from './whatsapp.service'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('whatsapp')
@Roles(Role.ADMIN)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('status')
  status(@Req() req: Request & { user: User }) {
    return this.whatsappService.status(req.user.tenantId)
  }

  @Post('connect')
  connect(@Req() req: Request & { user: User }) {
    return this.whatsappService.connect(req.user.tenantId)
  }

  @Get('qrcode')
  qrcode(@Req() req: Request & { user: User }) {
    return this.whatsappService.qrcode(req.user.tenantId)
  }

  @Post('disconnect')
  disconnect(@Req() req: Request & { user: User }) {
    return this.whatsappService.disconnect(req.user.tenantId)
  }
}
