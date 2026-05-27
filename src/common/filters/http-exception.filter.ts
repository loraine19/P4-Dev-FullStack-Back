import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiResponse } from '../helpers/api-response';
import { LoggerService } from '../logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  /* CATCH */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const raw =
      typeof body === 'string'
        ? body
        : (body as { message?: string | string[] }).message;
    // class-validator returns an array of messages -  join them
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : (raw ?? exception.message);

    this.logger.error(
      `${status}: ${message} | ${req.method} ${req.url}`,
      undefined,
      HttpExceptionFilter.name,
    );

    res.status(status).json(ApiResponse.error(message));
  }
}
