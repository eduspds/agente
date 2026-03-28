import { Controller, Get, Req } from '@nestjs/common'
import { Request } from 'express'
import { DashboardService } from './dashboard.service'
import { User } from '@prisma/client'

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Req() req: Request & { user: User }) {
    return this.dashboardService.getStats(req.user.tenantId)
  }
}
