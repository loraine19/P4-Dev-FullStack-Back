import { HttpStatus } from '@nestjs/common';
import { ErrorFilter } from './error.filter';
import { ERROR_MESSAGES } from '../constants/error-messages';

/* FACTORIES */
const makeMockLogger = () => ({ error: jest.fn(), log: jest.fn(), warn: jest.fn() } as any);

const makeMockHost = (method = 'GET', url = '/test') => {
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

describe('ErrorFilter', () => {
  let filter: ErrorFilter;

  beforeEach(() => {
    filter = new ErrorFilter(makeMockLogger());
  });

  afterEach(() => jest.clearAllMocks());

  /* EF.1 generic error */
  it('EF.1.1 catches any Error → responds 500 with generic message', () => {
    /* Arrange */
    const exception = new Error('Something went wrong');
    const { host, status, json } = makeMockHost('POST', '/upload');

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status:  'error',
        message: ERROR_MESSAGES.COMMON.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  /* EF.1.2 error without message */
  it('EF.1.2 error without message → still responds 500 with generic message', () => {
    /* Arrange */
    const exception = new Error();
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
