import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

// jest.mock replaces the entire bcrypt module with controllable jest.fn()
// needed because bcrypt compiles to CJS -- jest.spyOn cannot redefine its exports
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

/* FACTORIES */
// makeDeps: creates dependency stubs -- recreated in each test for isolation
const makeDeps = () => {
  // prisma.user exposes mocked Prisma methods -- no real DB involved
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  } as unknown as PrismaService;

  // signAsync always returns 'signed-token' -- tests logic, not JWT crypto
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  } as unknown as JwtService;

  const logger = {
    warn: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;

  const service = new AuthService(prisma, jwtService, logger);
  return { service, prisma, jwtService };
};

// makeRes: fake Express Response -- used to assert cookie/clearCookie are (or not) called
const makeRes = () =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as unknown as Response;



/* REGISTER */
describe('AuthService.register()', () => {
  /* 1.1 EMAIL LIBRE */
  it('1.1 email libre -> bcrypt.hash + prisma.create called', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);  // no existing user in DB
    (prisma.user.create as jest.Mock).mockResolvedValue({});
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');          // simulate bcrypt hash
    /* Act */
    await service.register({ email: 'a@test.local', password: 'Password1', name: 'A' });
    /* Assert */
    expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@test.local', passwordHash: 'hashed', name: 'A' },
    });
  });

  /* 1.2 EMAIL DEJA PRIS */
  it('1.2 email deja pris -> ConflictException', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });  // user already in DB
    /* Act & Assert */
    await expect(
      service.register({ email: 'a@test.local', password: 'Password1', name: 'A' }),
    ).rejects.toThrow(ConflictException);
  });
});

/* LOGIN */
/*mock*/
describe('AuthService.login()', () => {
  const USER = {
    id: 1,
    email: 'a@test.local',
    name: 'A',
    passwordHash: 'hashed',
  };

  /* 2.1 USER INCONNU */
  it('2.1 user inconnu -> UnauthorizedException', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);  // no user found
    /* Act & Assert */
    await expect(
      service.login({ email: 'a@test.local', password: 'Password1' }, makeRes()),
    ).rejects.toThrow(UnauthorizedException);
  });

  /* 2.1 WRONG PASSWORD */
  it('2.1 wrong password -> UnauthorizedException', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);  // compare returns false -> wrong pw
    /* Act & Assert */
    await expect(
      service.login({ email: 'a@test.local', password: 'wrong' }, makeRes()),
    ).rejects.toThrow(UnauthorizedException);
  });

  /* 2.2 SUCCESS WEB */
  it('2.2 succes web -> res.cookie() called, no access_token in body', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const res = makeRes();
    /* Act */
    const result = await service.login({ email: 'a@test.local', password: 'Password1', isMobile: false }, res);
    /* Assert */
    // web: token set as httpOnly cookie, not exposed in body
    expect(res.cookie).toHaveBeenCalled();
    expect(result.access_token).toBeUndefined();
    expect(result.user).toMatchObject({ id: 1, email: 'a@test.local', name: 'A' });
  });

  /* 2.3 SUCCES MOBILE */
  it('2.3 succes mobile -> token in body, res.cookie() not called', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const res = makeRes();
    /* Act */
    const result = await service.login({ email: 'a@test.local', password: 'Password1', isMobile: true }, res);
    /* Assert */
    // mobile: token in body, no cookie set
    expect(res.cookie).not.toHaveBeenCalled();
    expect(result.access_token).toBe('signed-token');
    expect(result.user).toMatchObject({ id: 1, email: 'a@test.local', name: 'A' });
  });
});
