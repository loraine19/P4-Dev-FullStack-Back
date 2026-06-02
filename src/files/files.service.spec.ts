import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { TagsService } from '../tags/tags.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));
jest.mock('fs', () => ({ existsSync: jest.fn().mockReturnValue(true), unlinkSync: jest.fn() }));
import * as fs from 'fs';

/* FACTORIES */
const makeDeps = () => {
  const prisma = {
    file: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    fileTag: { createMany: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;

  const tagsService = {
    attachToFile: jest.fn().mockResolvedValue(undefined),
  } as unknown as TagsService;

  const service = new FilesService(prisma, logger, tagsService);
  return { service, prisma, logger, tagsService };
};

const makeFile = (overrides = {}) => ({
  fieldname: 'file',
  originalname: 'test.txt',
  filename: 'stored-uuid.txt',
  mimetype: 'text/plain',
  size: 1024,
  ...overrides,
} as any);

const makeDbFile = (overrides = {}) => ({
  id: 1,
  userId: 42,
  filename: 'stored-uuid.txt',
  originalName: 'test.txt',
  size: 1024,
  mimeType: 'text/plain',
  shareToken: 'uuid-token',
  downloadPasswordHash: null,
  expiresAt: new Date(Date.now() + 7 * 86_400_000),
  createdAt: new Date(),
  fileTags: [],
  ...overrides,
});

describe('FilesService', () => {
  /* ---------------------------------------------------------- UPLOAD */
  describe('upload()', () => {
    it('C.1 valid file no password → shareToken + prisma.create', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      const dbFile = makeDbFile();
      (prisma.file.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        (prisma.file.create as jest.Mock).mockResolvedValue(dbFile);
        return fn(prisma);
      });

      /* Act */
      const result = await service.upload(makeFile(), { expirationDays: 7 }, 42);

      /* Assert */
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(typeof result.shareToken).toBe('string');
      expect(result.shareToken.length).toBeGreaterThan(0);
      expect(result.passwordProtected).toBe(false);
    });

    it('C.2 file with password → downloadPasswordHash set', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      const dbFile = makeDbFile({ downloadPasswordHash: 'hashed-password' });
      (prisma.file.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        (prisma.file.create as jest.Mock).mockResolvedValue(dbFile);
        return fn(prisma);
      });

      /* Act */
      const result = await service.upload(makeFile(), { expirationDays: 7, downloadPassword: 'Secret1!' }, 42);

      /* Assert */
      expect(result.passwordProtected).toBe(true);
    });

    it('C.3 tags provided → attachToFile in transaction', async () => {
      /* Arrange */
      const { service, prisma, tagsService } = makeDeps();
      const dbFile = makeDbFile();
      (prisma.file.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        (prisma.file.create as jest.Mock).mockResolvedValue(dbFile);
        return fn(prisma);
      });

      /* Act */
      await service.upload(makeFile(), { expirationDays: 7, tags: [1, 2] }, 42);

      /* Assert */
      expect(tagsService.attachToFile).toHaveBeenCalledWith({
        fileId: dbFile.id,
        tagIds: [1, 2],
        userId: 42,
        tx: prisma,
      });
    });
  });

  /* ---------------------------------------------------------- FIND ALL */
  describe('findAll()', () => {
    it('C.4 valid userId → returns file array', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findMany as jest.Mock).mockResolvedValue([makeDbFile(), makeDbFile({ id: 2, originalName: 'other.txt' })]);

      /* Act */
      const result = await service.findAll(42);

      /* Assert */
      expect(result).toHaveLength(2);
      expect(result[0].shareToken).toBe('uuid-token');
    });
  });

  /* ---------------------------------------------------------- REMOVE */
  describe('remove()', () => {
    it('C.5 file owner → fs.unlinkSync + prisma.delete', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(makeDbFile());
      (prisma.file.delete as jest.Mock).mockResolvedValue({});

      /* Act */
      await service.remove(1, 42);

      /* Assert */
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(prisma.file.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('C.6 missing file → NotFoundException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      /* Act & Assert */
      await expect(service.remove(99, 42)).rejects.toThrow(NotFoundException);
    });

    it('C.7 other user → ForbiddenException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(makeDbFile({ userId: 99 }));

      /* Act & Assert */
      await expect(service.remove(1, 42)).rejects.toThrow(ForbiddenException);
    });
  });
});
