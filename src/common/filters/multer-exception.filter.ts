import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiResponse } from '../helpers/api-response';
import { LoggerService } from '../logger/logger.service';
import { ERROR_MESSAGES } from '../constants/error-messages';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  /* CATCH */
  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? ERROR_MESSAGES.FILES.FILE_TOO_LARGE
        : ERROR_MESSAGES.FILES.INVALID_EXTENSION;

    this.logger.error(
      `MulterError: ${exception.code} | ${req.method} ${req.url}`,
      undefined,
      MulterExceptionFilter.name,
    );

    res.status(HttpStatus.BAD_REQUEST).json(ApiResponse.error(message));
  }
}
