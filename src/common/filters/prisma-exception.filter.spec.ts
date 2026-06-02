import { HttpStatus } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { ERROR_MESSAGES } from '../constants/error-messages';

/* FACTORIES */
const makeMockLogger = () => ({ error: jest.fn(), log: jest.fn(), warn: jest.fn() } as any);

const makeMockHost = (method = 'POST', url = '/tags') => {
  const json   = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    host: {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest:  jest.fn().mockReturnValue({ method, url }),
        getResponse: jest.fn().mockReturnValue({ status }),
      }),
    } as any,
    status,
    json,
  };
};

/** Minimal object that mimics Prisma's PrismaClientKnownRequestError shape */
const makePrismaError = (code: string, message = 'db error', meta?: { cause?: string }) =>
  ({ code, message, meta }) as any;

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter(makeMockLogger());
  });

  afterEach(() => jest.clearAllMocks());

  /* PF.1 P2002 → 409 Conflict */
  it('PF.1.1 P2002 unique constraint violation → 409 Conflict', () => {
    /* Arrange */
    const exception = makePrismaError('P2002', 'Unique constraint failed');
    const { host, status } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
  });

  /* PF.1.2 P2025 → 404 Not Found */
  it('PF.1.2 P2025 record not found → 404 Not Found', () => {
    /* Arrange */
    const exception = makePrismaError('P2025', 'Record not found');
    const { host, status } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  /* PF.1.3 P2000 → 400 Bad Request */
  it('PF.1.3 P2000 input value too long → 400 Bad Request + generic message', () => {
    /* Arrange */
    const exception = makePrismaError('P2000', 'Input value too long', { cause: 'field name' });
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ERROR_MESSAGES.COMMON.BAD_REQUEST }),
    );
  });

  /* PF.1.4 unknown Prisma code → 500 Internal Server Error */
  it('PF.1.4 unknown Prisma code → 500 with generic message', () => {
    /* Arrange */
    const exception = makePrismaError('P9999', 'Unknown prisma error');
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR }),
    );
  });
});
