import {
  GoneException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { DownloadService } from './download.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  createReadStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
}));
import * as bcrypt from 'bcrypt';

/* FACTORIES */
const makeDeps = () => {
  const prisma = {
    file: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;
  const service = new DownloadService(prisma, logger);
  return { service, prisma };
};

const makeDbFile = (overrides = {}) => ({
  id: 1,
  filename: 'stored.txt',
  originalName: 'rapport.txt',
  size: 2048,
  mimeType: 'text/plain',
  shareToken: 'valid-token',
  downloadPasswordHash: null,
  expiresAt: new Date(Date.now() + 86_400_000), // expires tomorrow
  ...overrides,
});

describe('DownloadService', () => {
  /* ---------------------------------------------------------- GET META */
  describe('getMeta()', () => {
    it('D.1 token valide → retourne métadonnées + requiresPassword false', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(makeDbFile());

      /* Act */
      const result = await service.getMeta('valid-token');

      /* Assert */
      expect(result.filename).toBe('rapport.txt');
      expect(result.requiresPassword).toBe(false);
    });

    it('D.2 token valide protégé → requiresPassword true', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(
        makeDbFile({ downloadPasswordHash: 'hashed' }),
      );

      /* Act */
      const result = await service.getMeta('valid-token');

      /* Assert */
      expect(result.requiresPassword).toBe(true);
    });

    it('D.3 token inconnu → NotFoundException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(null);

      /* Act & Assert */
      await expect(service.getMeta('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('D.4 token expiré → GoneException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(
        makeDbFile({ expiresAt: new Date(Date.now() - 1000) }), // expired yesterday
      );

      /* Act & Assert */
      await expect(service.getMeta('expired-token')).rejects.toThrow(GoneException);
    });
  });

  /* ---------------------------------------------------------- DOWNLOAD */
  describe('download()', () => {
    it('D.5 fichier sans mot de passe → retourne StreamableFile', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(makeDbFile());

      /* Act */
      const result = await service.download('valid-token', {});

      /* Assert */
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('D.6 bon mot de passe → retourne StreamableFile', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(
        makeDbFile({ downloadPasswordHash: 'hashed' }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      /* Act */
      const result = await service.download('valid-token', { password: 'Secret1!' });

      /* Assert */
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('D.7 mauvais mot de passe → UnauthorizedException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(
        makeDbFile({ downloadPasswordHash: 'hashed' }),
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      /* Act & Assert */
      await expect(service.download('valid-token', { password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('D.8 token expiré → GoneException', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findUnique as jest.Mock).mockResolvedValue(
        makeDbFile({ expiresAt: new Date(Date.now() - 1000) }),
      );

      /* Act & Assert */
      await expect(service.download('expired-token', {})).rejects.toThrow(GoneException);
    });
  });
});
