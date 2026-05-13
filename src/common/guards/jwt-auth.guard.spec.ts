import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { IJwtPayload } from '../interfaces/jwt-payload.interface';

/* FACTORIES */
// makeGuard: creates a JwtService stub + guard -- recreated in each test for isolation
const makeGuard = () => {
  // plain object with mocked method -- no NestJS DI needed
  const jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
  const guard = new JwtAuthGuard(jwtService);
  return { guard, jwtService };
};

// makeContext: builds a fake ExecutionContext with given cookies/headers
const makeContext = (cookies: Record<string, string>, authorization?: string): ExecutionContext => {
  const request = {
    cookies,
    headers: { authorization },
    // canActivate writes to request['user'] after token verification
  } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

/* EXTRACT TOKEN */
describe('JwtAuthGuard.extractToken()', () => {
  /* 1.1 COOKIE */
  it('WEB -> Cookie present -> returns cookie token', () => {
    /* Arrange */
    const { guard } = makeGuard();
    const req = { cookies: { access_token: 'cookie-test-token' }, headers: {} } as unknown as Request;
    /* Act & Assert */
    // extractToken is protected -- (guard as any) bypasses TS access check
    expect((guard as any).extractToken(req)).toBe('cookie-test-token');
  });

  /* 1.2 BEARER */
  it('MOBILE -> No cookie -> Bearer present -> returns Bearer token', () => {
    /* Arrange */
    const { guard } = makeGuard();
    const req = { cookies: {}, headers: { authorization: 'Bearer bearer-test-token' } } as unknown as Request;
    /* Act & Assert */
    expect((guard as any).extractToken(req)).toBe('bearer-test-token');
  });

  /* 1.3 NO TOKEN */
  it('NO TOKEN -> returns null', () => {
    /* Arrange */
    const { guard } = makeGuard();
    const req = { cookies: {}, headers: {} } as unknown as Request;
    /* Act & Assert */
    expect((guard as any).extractToken(req)).toBeNull();
  });
});

/* CAN ACTIVATE */
describe('JwtAuthGuard.canActivate()', () => {
  /* 2.1 TOKEN VALIDE */
  it('valid token -> injects request.user and returns true', async () => {
    /* Arrange */
    const { guard, jwtService } = makeGuard();
    const payload: IJwtPayload = { sub: 1 };
    // mockResolvedValue: verifyAsync resolves with payload instead of verifying a real JWT
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(payload);
    const ctx = makeContext({}, 'Bearer valid-token');
    const req = ctx.switchToHttp().getRequest<any>();
    /* Act */
    const result = await guard.canActivate(ctx);
    /* Assert */
    expect(result).toBe(true);
    expect(req['user']).toEqual(payload);
  });

  /* 2.2 TOKEN INVALIDE */
  it('invalid token -> throws UnauthorizedException', async () => {
    /* Arrange */
    const { guard, jwtService } = makeGuard();
    // mockRejectedValue: verifyAsync throws -- simulates a corrupted or expired token
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('invalid'));
    const ctx = makeContext({}, 'Bearer bad-token');
    /* Act & Assert */
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  /* 2.3 TOKEN ABSENT */
  it('no token -> throws UnauthorizedException', async () => {
    /* Arrange */
    const { guard } = makeGuard();
    const ctx = makeContext({});
    /* Act & Assert */
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
