import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { User } from '@prisma/client'
import { LeadsService } from './leads.service'
import {
  CreateLeadSchema,
  ListLeadsQuerySchema,
  PatchLeadSchema,
} from './dto/lead.dto'

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  create(@Req() req: Request & { user: User }, @Body() body: unknown) {
    const dto = CreateLeadSchema.parse(body)
    return this.leadsService.create(req.user.tenantId, dto)
  }

  @Get()
  list(@Req() req: Request & { user: User }, @Query() query: Record<string, string>) {
    const dto = ListLeadsQuerySchema.parse(query)
    return this.leadsService.list(req.user.tenantId, dto)
  }

  @Get(':id')
  findOne(@Req() req: Request & { user: User }, @Param('id') id: string) {
    return this.leadsService.findOne(id, req.user.tenantId)
  }

  @Patch(':id')
  patch(
    @Req() req: Request & { user: User },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = PatchLeadSchema.parse(body)
    return this.leadsService.patch(id, req.user.tenantId, dto, req.user.id)
  }

  @Post(':id/reprocess')
  reprocess(@Req() req: Request & { user: User }, @Param('id') id: string) {
    return this.leadsService.reprocess(id, req.user.tenantId)
  }
}
