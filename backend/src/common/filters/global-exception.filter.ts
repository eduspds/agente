import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const isHttpException = exception instanceof HttpException
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const message = isHttpException
      ? (exception.getResponse() as { message?: string | string[] })?.message ?? exception.message
      : 'Erro interno do servidor'

    const error = isHttpException
      ? (exception.getResponse() as { error?: string })?.error ?? 'HttpException'
      : 'InternalServerError'

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(exception)
    } else {
      const msgStr = Array.isArray(message) ? message.join(', ') : String(message)
      this.logger.error(`${statusCode} ${request.method} ${request.url} — ${msgStr}`)
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
