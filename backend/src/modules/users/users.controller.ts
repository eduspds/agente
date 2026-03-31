import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import {
  CreateUserDtoSwagger,
  CreateUserSchema,
  UpdateUserDtoSwagger,
  UpdateUserSchema,
} from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar usuário no tenant (apenas ADMIN)' })
  @ApiResponse({ status: 201 })
  async create(@Req() req: Request, @Body() body: unknown) {
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    const tenantId = req.tenantId as string;
    return this.usersService.create(tenantId, result.data);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuários do tenant (apenas ADMIN)' })
  async findAll(@Req() req: Request) {
    return this.usersService.findAll(req.tenantId as string);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.findOne(req.tenantId as string, id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar usuário' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.usersService.update(req.tenantId as string, id, result.data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar usuário (soft delete)' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.usersService.remove(req.tenantId as string, id);
  }
}
