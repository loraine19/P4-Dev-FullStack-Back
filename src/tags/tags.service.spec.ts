import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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
    it('E.1 valid userId → returns tag array', async () => {
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
    it('E.2 free name → tag created and returned', async () => {
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

    it('E.3 duplicate same user → ConflictException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findFirst as jest.Mock).mockResolvedValue(makeDbTag());

      /* Act & Assert */
      await expect(service.create({ name: 'react' }, 42)).rejects.toThrow(ConflictException);
    });
  });

  /* ---------------------------------------------------------- REMOVE */
  describe('remove()', () => {
    it('E.4 tag owner → prisma.delete called', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(makeDbTag());
      (prisma.tag.delete as jest.Mock).mockResolvedValue({});

      /* Act */
      await service.remove(1, 42);

      /* Assert */
      expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('E.5 missing tag → NotFoundException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

      /* Act & Assert */
      await expect(service.remove(99, 42)).rejects.toThrow(NotFoundException);
    });

    it('E.6 other user → ForbiddenException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.tag.findUnique as jest.Mock).mockResolvedValue(makeDbTag({ userId: 99 }));

      /* Act & Assert */
      await expect(service.remove(1, 42)).rejects.toThrow(ForbiddenException);
    });
  });

  /* ---------------------------------------------------------- ATTACH TO FILE */
  describe('attachToFile()', () => {
    const makeTx = (overrides = {}) => ({
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      fileTag: { createMany: jest.fn().mockResolvedValue({}) },
      ...overrides,
    }) as unknown as Prisma.TransactionClient;

    it('E.9 all valid tags → fileTag.createMany with skipDuplicates', async () => {
      /* Arrange */
      const { service } = makeDeps();
      const tx = makeTx({
        tag: { findMany: jest.fn().mockResolvedValue([{ id: 10, userId: 42 }, { id: 20, userId: 42 }]) },
      });

      /* Act */
      await service.attachToFile({ fileId: 1, tagIds: [10, 20], userId: 42, tx });

      /* Assert */
      expect(tx.fileTag.createMany).toHaveBeenCalledWith({
        data: [{ fileId: 1, tagId: 10 }, { fileId: 1, tagId: 20 }],
        skipDuplicates: true,
      });
    });

    it('E.10 missing tag or other user → BadRequestException, no createMany', async () => {
      /* Arrange */
      const { service } = makeDeps();
      // findMany returns only 1 tag whereas 2 were requested → length mismatch
      const tx = makeTx({
        tag: { findMany: jest.fn().mockResolvedValue([{ id: 10, userId: 42 }]) },
      });

      /* Act & Assert */
      await expect(
        service.attachToFile({ fileId: 1, tagIds: [10, 20], userId: 42, tx }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.fileTag.createMany).not.toHaveBeenCalled();
    });
  });

});
