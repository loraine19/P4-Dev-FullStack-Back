import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
      findUniqueOrThrow: jest.fn(),
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

/* REGISTER */
describe('AuthService.register()', () => {
  /* 1.1 FREE EMAIL */
  it('1.1 free email -> bcrypt.hash + prisma.create called', async () => {
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
  it('1.2 email taken -> ConflictException', async () => {
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
describe('AuthService.login()', () => {
  const USER = {
    id: 1,
    email: 'a@test.local',
    name: 'A',
    passwordHash: 'hashed',
  };

  /* 2.1 USER INCONNU */
  it('2.1 unknown user -> UnauthorizedException', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    /* Act & Assert */
    await expect(service.login({ email: 'a@test.local', password: 'Password1' })).rejects.toThrow(UnauthorizedException);
  });

  /* 2.2 WRONG PASSWORD */
  it('2.2 wrong password -> UnauthorizedException', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    /* Act & Assert */
    await expect(service.login({ email: 'a@test.local', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  /* 2.3 SUCCESS */
  it('2.3 valid credentials -> returns user + raw token (no HTTP concern)', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(USER);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    /* Act */
    const result = await service.login({ email: 'a@test.local', password: 'Password1' });
    /* Assert */
    expect(result.token).toBe('signed-token');
    expect(result.user).toMatchObject({ id: 1, email: 'a@test.local', name: 'A' });
  });
});

/* ME */
describe('AuthService.me()', () => {
  const USER = { id: 1, email: 'a@test.local', name: 'A', passwordHash: 'h' };

  it('3.1 valid userId → returns IUserPublic without passwordHash', async () => {
    /* Arrange */
    const { service, prisma } = makeDeps();
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(USER);
    /* Act */
    const result = await service.me(1);
    /* Assert */
    expect(result).toEqual({ id: 1, email: 'a@test.local', name: 'A' });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
