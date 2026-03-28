import { Controller, Get, Patch, Body, Req } from '@nestjs/common'
import { Request } from 'express'
import { User, Role } from '@prisma/client'
import { TenantsService } from './tenants.service'
import {
  PatchTenantAiSchema,
  PatchTenantFunnelSchema,
  PatchTenantGeneralSchema,
} from './dto/tenant.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('tenants')
@Roles(Role.ADMIN)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('me')
  getMe(@Req() req: Request & { user: User }) {
    return this.tenantsService.getMe(req.user.tenantId)
  }

  @Patch('me/general')
  patchGeneral(@Req() req: Request & { user: User }, @Body() body: unknown) {
    const dto = PatchTenantGeneralSchema.parse(body)
    return this.tenantsService.patchGeneral(req.user.tenantId, dto)
  }

  @Patch('me/ai')
  patchAi(@Req() req: Request & { user: User }, @Body() body: unknown) {
    const dto = PatchTenantAiSchema.parse(body)
    return this.tenantsService.patchAi(req.user.tenantId, dto)
  }

  @Patch('me/funnel')
  patchFunnel(@Req() req: Request & { user: User }, @Body() body: unknown) {
    const dto = PatchTenantFunnelSchema.parse(body)
    return this.tenantsService.patchFunnel(req.user.tenantId, dto)
  }
}
