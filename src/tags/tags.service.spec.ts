import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

/* FACTORIES */
const makeDeps = () => {
  const prisma = {
    tag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;
  const service = new TagsService(prisma, logger);
  return { service, prisma };
};

const makeDbTag = (overrides = {}) => ({
  id: 1,
  name: 'react',
  userId: 42,
  ...overrides,
});

describe('TagsService', () => {
  /* ---------------------------------------------------------- FIND ALL */
  describe('findAll()', () => {
    it('E.1 userId valide → retourne tableau de tags', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findMany as jest.Mock).mockResolvedValue([makeDbTag(), makeDbTag({ id: 2, name: 'node' })]);

      /* Act */
      const result = await service.findAll(42);

      /* Assert */
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: 'react' });
    });
  });

  /* ---------------------------------------------------------- CREATE */
  describe('create()', () => {
    it('E.2 nom libre → tag créé + retourné', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.tag.create as jest.Mock).mockResolvedValue(makeDbTag());

      /* Act */
      const result = await service.create({ name: 'react' }, 42);

      /* Assert */
      expect(prisma.tag.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 1, name: 'react' });
    });

    it('E.3 doublon même utilisateur → ConflictException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(makeDbTag());

      /* Act & Assert */
      await expect(service.create({ name: 'react' }, 42)).rejects.toThrow(ConflictException);
    });
  });

  /* ---------------------------------------------------------- REMOVE */
  describe('remove()', () => {
    it('E.4 propriétaire du tag → prisma.delete appelé', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(makeDbTag());
      (prisma.tag.delete as jest.Mock).mockResolvedValue({});

      /* Act */
      await service.remove(1, 42);

      /* Assert */
      expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('E.5 tag inexistant → NotFoundException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      /* Act & Assert */
      await expect(service.remove(99, 42)).rejects.toThrow(NotFoundException);
    });

    it('E.6 autre utilisateur → ForbiddenException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(makeDbTag({ userId: 99 }));

      /* Act & Assert */
      await expect(service.remove(1, 42)).rejects.toThrow(ForbiddenException);
    });
  });

  /* ---------------------------------------------------------- VALIDATE OWNERSHIP */
  describe('validateOwnership()', () => {
    it('E.7 tag appartient à userId → ne lève pas d\'exception', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(makeDbTag());

      /* Act & Assert */
      await expect(service.validateOwnership(1, 42)).resolves.toBeUndefined();
    });

    it('E.8 tag n\'appartient pas à userId → BadRequestException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);

      /* Act & Assert */
      await expect(service.validateOwnership(1, 42)).rejects.toThrow(BadRequestException);
    });
  });
});
