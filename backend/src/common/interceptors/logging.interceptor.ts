import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { JwtPayload } from '../guards/tenant.guard';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const user = request.user as JwtPayload | undefined;

          const logEntry = {
            level: 'info',
            timestamp: new Date().toISOString(),
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            tenantId: user?.tenantId ?? request.tenantId ?? 'anonymous',
            userId: user?.sub ?? 'anonymous',
          };

          this.logger.log(JSON.stringify(logEntry));
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          const user = request.user as JwtPayload | undefined;

          const logEntry = {
            level: 'error',
            timestamp: new Date().toISOString(),
            method: request.method,
            path: request.url,
            statusCode: response.statusCode || 500,
            duration: `${duration}ms`,
            tenantId: user?.tenantId ?? 'anonymous',
            error: error.message,
          };

          this.logger.error(JSON.stringify(logEntry));
        },
      }),
    );
  }
}
