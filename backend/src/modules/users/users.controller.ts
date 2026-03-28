import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { User, Role } from '@prisma/client'
import { UsersService } from './users.service'
import { CreateUserSchema, ListUsersQuerySchema, PatchUserSchema } from './dto/user.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  list(@Req() req: Request & { user: User }, @Query() query: Record<string, string>) {
    const dto = ListUsersQuerySchema.parse(query)
    return this.usersService.list(req.user.tenantId, dto)
  }

  @Get(':id')
  findOne(@Req() req: Request & { user: User }, @Param('id') id: string) {
    return this.usersService.findOne(id, req.user.tenantId)
  }

  @Post()
  create(@Req() req: Request & { user: User }, @Body() body: unknown) {
    const dto = CreateUserSchema.parse(body)
    return this.usersService.create(req.user.tenantId, dto)
  }

  @Patch(':id')
  patch(
    @Req() req: Request & { user: User },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = PatchUserSchema.parse(body)
    return this.usersService.patch(id, req.user.tenantId, dto)
  }
}
