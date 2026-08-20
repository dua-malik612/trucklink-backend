import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as any;
        message = Array.isArray(r.message)
          ? 'Validation failed'
          : r.message ?? exception.message;
        if (Array.isArray(r.message)) {
          details = r.message;
        } else if (r.details) {
          details = r.details;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const code = CODE_MAP[statusCode] ?? 'ERROR';

    // Terminal aur Railway Dashboard par error print karwane ke liye
    console.error('--- EXCEPTION CAUGHT BY FILTER ---');
    console.error(`PATH: ${request.url}`);
    console.error(`STATUS: ${statusCode}`);
    console.error('DETAILS:', exception);

    response.status(statusCode).json({
      error: {
        statusCode,
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}