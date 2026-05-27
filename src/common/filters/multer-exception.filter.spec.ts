import { HttpStatus } from '@nestjs/common';
import { MulterError } from 'multer';
import { MulterExceptionFilter } from './multer-exception.filter';
import { ERROR_MESSAGES } from '../constants/error-messages';

/* FACTORIES */
const makeMockLogger = () => ({ error: jest.fn(), log: jest.fn(), warn: jest.fn() } as any);

const makeMockHost = (method = 'POST', url = '/files') => {
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

describe('MulterExceptionFilter', () => {
  let filter: MulterExceptionFilter;

  beforeEach(() => {
    filter = new MulterExceptionFilter(makeMockLogger());
  });

  afterEach(() => jest.clearAllMocks());

  /* MF.1 LIMIT_FILE_SIZE */
  it('MF.1.1 LIMIT_FILE_SIZE → 400 with FILE_TOO_LARGE message', () => {
    /* Arrange */
    const exception = new MulterError('LIMIT_FILE_SIZE');
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ERROR_MESSAGES.FILES.FILE_TOO_LARGE }),
    );
  });

  /* MF.1.2 other Multer error */
  it('MF.1.2 other MulterError code → 400 with INVALID_EXTENSION message', () => {
    /* Arrange */
    const exception = new MulterError('LIMIT_UNEXPECTED_FILE');
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ERROR_MESSAGES.FILES.INVALID_EXTENSION }),
    );
  });
});
