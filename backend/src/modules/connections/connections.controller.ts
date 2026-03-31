import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ConnectionsService } from './connections.service';
import { CreateConnectionSchema } from './dto/connection.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('connections')
@ApiBearerAuth('access-token')
@ApiSecurity('tenant-id')
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conexões WhatsApp do tenant' })
  async list(@Req() req: Request) {
    return this.connectionsService.findAll(req.tenantId as string);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar conexão (apenas ADMIN)' })
  async create(@Req() req: Request, @Body() body: unknown) {
    const result = CreateConnectionSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.connectionsService.create(
      req.tenantId as string,
      result.data,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover conexão (apenas ADMIN)' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    await this.connectionsService.remove(req.tenantId as string, id);
  }

  @Post(':id/reconnect')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Solicitar reconexão / novo QR (apenas ADMIN)' })
  async reconnect(@Req() req: Request, @Param('id') id: string) {
    return this.connectionsService.reconnect(req.tenantId as string, id);
  }
}
