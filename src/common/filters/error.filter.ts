import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiResponse } from '../helpers/api-response';
import { LoggerService } from '../logger/logger.service';
import { ErrorMessages } from '../constants/error-messages';

@Catch(Error)
export class ErrorFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  /* CATCH */
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const message = exception.message || ErrorMessages.INTERNAL_SERVER_ERROR;

    this.logger.error(
      `${message} | ${req.method} ${req.url}`,
      exception.stack,
      ErrorFilter.name,
    );

    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error(ErrorMessages.INTERNAL_SERVER_ERROR));
  }
}
