import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiResponse } from '../common/helpers/api-response';

/* FACTORIES */
const makeDeps = () => ({
  authService: {
    register: jest.fn(),
    login:    jest.fn(),
    logout:   jest.fn(),
  } as unknown as AuthService,
});

const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

describe('AuthController', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof makeDeps>['authService'];

  beforeEach(() => {
    const deps = makeDeps();
    authService = deps.authService;
    controller  = new AuthController(authService);
  });

  afterEach(() => jest.clearAllMocks());

  /* AC.1 register() */
  describe('AC.1 register()', () => {
    it('AC.1.1 calls authService.register and returns success envelope', async () => {
      /* Arrange */
      (authService.register as jest.Mock).mockResolvedValueOnce(undefined);
      const dto = { name: 'Alice', email: 'alice@test.com', password: 'pw12345' } as any;

      /* Act */
      const result = await controller.register(dto);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Compte créé avec succès'));
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  /* AC.2 login() */
  describe('AC.2 login()', () => {
    it('AC.2.1 calls authService.login and wraps result in success envelope', async () => {
      /* Arrange */
      const authData = { user: { id: 1, email: 'alice@test.com', name: 'Alice' }, access_token: null };
      (authService.login as jest.Mock).mockResolvedValueOnce(authData);
      const dto = { email: 'alice@test.com', password: 'pw12345' } as any;

      /* Act */
      const result = await controller.login(dto, mockRes);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Connexion réussie', authData));
      expect(authService.login).toHaveBeenCalledWith(dto, mockRes);
    });
  });

  /* AC.3 logout() */
  describe('AC.3 logout()', () => {
    it('AC.3.1 calls authService.logout with user.sub and returns success envelope', async () => {
      /* Arrange */
      (authService.logout as jest.Mock).mockResolvedValueOnce(undefined);
      const user = { sub: 1, email: 'alice@test.com' } as any;

      /* Act */
      const result = await controller.logout(user, mockRes);

      /* Assert */
      expect(result).toEqual(ApiResponse.success('Déconnexion réussie'));
      expect(authService.logout).toHaveBeenCalledWith(1, mockRes);
    });
  });
});
