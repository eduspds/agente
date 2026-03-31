import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import {
  LoginSchema,
  LoginDtoSwagger,
  RefreshTokenDtoSwagger,
  AuthResponseDto,
  RefreshTokenSchema,
} from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { RefreshPayload } from './strategies/refresh.strategy';
import { ZodError } from 'zod';
import { BadRequestException } from '@nestjs/common';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter tokens JWT' })
  @ApiBody({ type: LoginDtoSwagger })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() body: unknown) {
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(
        result.error.errors.map((e) => e.message).join(', '),
      );
    }
    return this.authService.login(result.data);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiBody({ type: RefreshTokenDtoSwagger })
  @ApiResponse({ status: 200, schema: { properties: { accessToken: { type: 'string' } } } })
  async refresh(@Req() req: Request) {
    const payload = req.user as RefreshPayload;
    return this.authService.refresh(payload, payload.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invalidar refresh token (logout)' })
  @ApiResponse({ status: 204 })
  async logout(@Body() body: unknown) {
    const result = RefreshTokenSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException('refreshToken é obrigatório');
    }
    await this.authService.logout(result.data.refreshToken);
  }
}
