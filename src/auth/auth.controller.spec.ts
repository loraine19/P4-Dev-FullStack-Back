import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiResponse } from '../common/helpers/api-response';

/* FACTORIES */
const makeDeps = () => ({
  authService: {
    register: jest.fn(),
    login:    jest.fn(),
    logout:   jest.fn(),
    me:       jest.fn(),
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
      const dto = { name: 'Alice', email: 'alice@test.com', password: 'Password1' } as any;
      /* Act */
      const result = await controller.register(dto);
      /* Assert */
      expect(result).toEqual(ApiResponse.success('Compte créé avec succès'));
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });

  /* AC.2 login() */
  describe('AC.2 login()', () => {
    const USER = { id: 1, email: 'alice@test.com', name: 'Alice' };

    it('AC.2.1 web login -> cookie set, token not in body', async () => {
      /* Arrange */
      (authService.login as jest.Mock).mockResolvedValueOnce({ user: USER, token: 'tok' });
      const dto = { email: 'alice@test.com', password: 'Password1', isMobile: false } as any;
      /* Act */
      const result = await controller.login(dto, mockRes);
      /* Assert */
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(result).toEqual(ApiResponse.success('Connexion réussie', { user: USER }));
      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('AC.2.2 mobile login -> token in body, no cookie', async () => {
      /* Arrange */
      (authService.login as jest.Mock).mockResolvedValueOnce({ user: USER, token: 'tok' });
      const dto = { email: 'alice@test.com', password: 'Password1', isMobile: true } as any;
      /* Act */
      const result = await controller.login(dto, mockRes);
      /* Assert */
      expect(mockRes.cookie).not.toHaveBeenCalled();
      expect(result).toEqual(ApiResponse.success('Connexion réussie', { user: USER, access_token: 'tok' }));
    });
  });

  /* AC.3 logout() */
  describe('AC.3 logout()', () => {
    it('AC.3.1 calls authService.logout with userId, clears cookie, returns success envelope', async () => {
      /* Arrange */
      (authService.logout as jest.Mock).mockResolvedValueOnce(undefined);
      /* Act */
      const result = await controller.logout(1, mockRes);
      /* Assert */
      expect(result).toEqual(ApiResponse.success('Déconnexion réussie'));
      expect(authService.logout).toHaveBeenCalledWith(1);
      expect(mockRes.clearCookie).toHaveBeenCalled();
    });
  });

  /* AC.4 me() */
  describe('AC.4 me()', () => {
    it('AC.4.1 valid userId → envelope with IUserPublic', async () => {
      /* Arrange */
      const user = { id: 1, email: 'alice@test.com', name: 'Alice' };
      (authService.me as jest.Mock).mockResolvedValueOnce(user);
      /* Act */
      const result = await controller.me(1);
      /* Assert */
      expect(authService.me).toHaveBeenCalledWith(1);
      expect(result).toEqual(ApiResponse.success('Utilisateur authentifié', user));
    });
  });
});
