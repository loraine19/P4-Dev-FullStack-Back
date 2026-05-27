import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

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

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter(makeMockLogger());
  });

  afterEach(() => jest.clearAllMocks());

  /* HF.1 message string */
  it('HF.1.1 string body → responds with that message and correct status', () => {
    /* Arrange */
    const exception = new HttpException('Accès non autorisé', HttpStatus.UNAUTHORIZED);
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Accès non autorisé' }),
    );
  });

  /* HF.1.2 object body with message string */
  it('HF.1.2 object body with message string → uses that message', () => {
    /* Arrange */
    const exception = new HttpException({ message: 'Erreur de validation' }, HttpStatus.BAD_REQUEST);
    const { host, status, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erreur de validation' }),
    );
  });

  /* HF.1.3 class-validator array of messages */
  it('HF.1.3 object body with message array → joins messages with comma', () => {
    /* Arrange */
    const exception = new HttpException({ message: ['Champ A requis', 'Champ B invalide'] }, HttpStatus.UNPROCESSABLE_ENTITY);
    const { host, json } = makeMockHost();

    /* Act */
    filter.catch(exception, host);

    /* Assert */
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Champ A requis, Champ B invalide' }),
    );
  });
});
