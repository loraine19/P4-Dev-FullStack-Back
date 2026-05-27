import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

/* FACTORIES */
const makeGuard = () => {
  const jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
  const guard = new OptionalJwtAuthGuard(jwtService);
  return { guard, jwtService };
};

const makeContext = (cookies: Record<string, string> = {}, authorization?: string): ExecutionContext => {
  const request = { cookies, headers: { authorization } } as any;
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
};

describe('OptionalJwtAuthGuard', () => {
  afterEach(() => jest.clearAllMocks());

  /* OG.1.1 parent succeeds */
  it('OG.1.1 valid token → canActivate returns true (from parent)', async () => {
    /* Arrange */
    const { guard, jwtService } = makeGuard();
    (jwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({ sub: 1 });
    const ctx = makeContext({}, 'Bearer valid-token');

    /* Act */
    const result = await guard.canActivate(ctx);

    /* Assert */
    expect(result).toBe(true);
  });

  /* OG.1.2 parent throws (no token) → still returns true */
  it('OG.1.2 missing / invalid token → canActivate swallows error and returns true', async () => {
    /* Arrange */
    const { guard, jwtService } = makeGuard();
    (jwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('no token'));
    const ctx = makeContext({});

    /* Act */
    const result = await guard.canActivate(ctx);

    /* Assert */
    expect(result).toBe(true);
  });
});
