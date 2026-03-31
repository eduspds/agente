import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';

    const errorResponse = this.buildErrorResponse(
      exception,
      request.url,
      isProduction,
    );

    // Loga com nível adequado — 5xx são erros reais, 4xx são esperados
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `[${errorResponse.statusCode}] ${errorResponse.message} — ${request.method} ${request.url}`,
        isProduction ? undefined : (exception instanceof Error ? exception.stack : String(exception)),
      );
    } else {
      this.logger.warn(
        `[${errorResponse.statusCode}] ${errorResponse.message} — ${request.method} ${request.url}`,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    path: string,
    isProduction: boolean,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();

    // Exceções HTTP do NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
          ? Array.isArray((exceptionResponse as { message: unknown }).message)
            ? ((exceptionResponse as { message: string[] }).message.join(', '))
            : String((exceptionResponse as { message: unknown }).message)
          : exception.message;

      return {
        statusCode: status,
        message,
        error: exception.name,
        timestamp,
        path,
      };
    }

    // Erros de validação Zod
    if (exception instanceof ZodError) {
      const messages = exception.errors.map(
        (e) => `${e.path.join('.')}: ${e.message}`,
      );
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dados de entrada inválidos',
        error: 'ZodValidationError',
        timestamp,
        path,
        details: isProduction ? undefined : messages,
      };
    }

    // Erros do Prisma — tratados para não vazar detalhes do banco
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, path, timestamp);
    }

    if (exception instanceof PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dados inválidos para a operação no banco',
        error: 'DatabaseValidationError',
        timestamp,
        path,
      };
    }

    // Erro genérico — nunca expor stack em produção
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction
        ? 'Erro interno do servidor'
        : (exception instanceof Error ? exception.message : String(exception)),
      error: 'InternalServerError',
      timestamp,
      path,
    };
  }

  private handlePrismaError(
    error: PrismaClientKnownRequestError,
    path: string,
    timestamp: string,
  ): ErrorResponse {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Registro duplicado — violação de constraint única',
          error: 'ConflictError',
          timestamp,
          path,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado',
          error: 'NotFoundError',
          timestamp,
          path,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Violação de chave estrangeira',
          error: 'ForeignKeyError',
          timestamp,
          path,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro no banco de dados',
          error: 'DatabaseError',
          timestamp,
          path,
        };
    }
  }
}
