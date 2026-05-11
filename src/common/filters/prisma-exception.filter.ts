import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ApiResponse } from '../helpers/api-response';
import { LoggerService } from '../logger/logger.service';
import { ERROR_MESSAGES } from '../constants/error-messages';

interface IPrismaKnownRequestError {
  code: string;
  message: string;
  meta?: {
    cause?: unknown;
  };
}

const PrismaKnownRequestError = (
  Prisma as unknown as {
    PrismaClientKnownRequestError: new (...args: unknown[]) => Error;
  }
).PrismaClientKnownRequestError;

@Catch(PrismaKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  /* CATCH */
  catch(exception: IPrismaKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const prismaError = exception;
    const detail =
      (prismaError.meta?.cause as string | undefined) ?? prismaError.message;
    let status: HttpStatus;
    let responseMessage = `PRISMA ${prismaError.code}: ${detail}`;

    switch (prismaError.code) {
      case 'P2002':
      case 'P2003':
      case 'P2004':
      case 'P1014':
        status = HttpStatus.CONFLICT;
        break;
      case 'P2001':
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        break;
      case 'P2000':
      case 'P2006':
      case 'P2011':
      case 'P2012':
      case 'P2013':
      case 'P2016':
      case 'P2020':
      case 'P2021':
      case 'P2036':
        status = HttpStatus.BAD_REQUEST;
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        responseMessage = ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR;
    }

    this.logger.error(
      `${prismaError.code}: ${detail} | ${req.method} ${req.url}`,
      undefined,
      PrismaExceptionFilter.name,
    );

    res.status(status).json(ApiResponse.error(responseMessage));
  }
}
