import { Controller, Get, Param, Req } from '@nestjs/common'
import { Request } from 'express'
import { User } from '@prisma/client'
import { ConversationsService } from './conversations.service'

@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  list(@Req() req: Request & { user: User }) {
    return this.conversationsService.list(req.user.tenantId)
  }

  @Get(':leadId')
  detail(@Req() req: Request & { user: User }, @Param('leadId') leadId: string) {
    return this.conversationsService.getLeadMessages(leadId, req.user.tenantId)
  }
}
