import { CronTaskService } from './cron-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));
import * as fs from 'fs';

/* FACTORIES */
const makeDeps = () => {
  const prisma = {
    file: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;
  const service = new CronTaskService(prisma, logger);
  return { service, prisma, logger };
};

describe('CronTaskService', () => {
  describe('deleteExpiredFiles()', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    it('F.1 expired files present → fs.unlinkSync + prisma.deleteMany', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      const expiredFiles = [
        { id: 1, filename: 'expired1.txt' },
        { id: 2, filename: 'expired2.txt' },
      ];
      (prisma.file.findMany as jest.Mock).mockResolvedValue(expiredFiles);
      (prisma.file.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      /* Act */
      await service.deleteExpiredFiles();

      /* Assert */
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      // service first findMany by date, then deleteMany by collected IDs
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
      });
    });

    it('F.2 expired file missing on disk → no unlinkSync, deleteMany still', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (prisma.file.findMany as jest.Mock).mockResolvedValue([{ id: 1, filename: 'ghost.txt' }]);
      (prisma.file.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      /* Act */
      await service.deleteExpiredFiles();

      /* Assert */
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(prisma.file.deleteMany).toHaveBeenCalled();
    });

    it('F.3 no expired files → deleteMany called, count 0, no log', async () => {
      /* Arrange */
      const { service, prisma, logger } = makeDeps();
      (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.file.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      /* Act */
      await service.deleteExpiredFiles();

      /* Assert */
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
    });
  });

  describe('scanOrphanFiles()', () => {
    const OLD_MTIME = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 jours → orphan
    const RECENT_MTIME = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 jours → trop récent

    beforeEach(() => { jest.clearAllMocks(); });

    it('O.1 file not in DB + mtime > 7d → unlinkSync + warn', async () => {
      /* Arrange */
      const { service, prisma, logger } = makeDeps();
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['orphan.txt']);
      (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: OLD_MTIME });
      (prisma.file.findFirst as jest.Mock).mockResolvedValue(null);

      /* Act */
      await service.scanOrphanFiles();

      /* Assert */
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('orphan.txt'),
        expect.any(String),
      );
    });

    it('O.2 file not in DB + mtime < 7d → unlinkSync not called', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['recent.txt']);
      (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: RECENT_MTIME });

      /* Act */
      await service.scanOrphanFiles();

      /* Assert */
      expect(prisma.file.findFirst).not.toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('O.3 file in DB + mtime > 7d → unlinkSync not called', async () => {
      /* Arrange */
      const { service, prisma } = makeDeps();
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['known.txt']);
      (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: OLD_MTIME });
      (prisma.file.findFirst as jest.Mock).mockResolvedValue({ id: 1, filename: 'known.txt' });

      /* Act */
      await service.scanOrphanFiles();

      /* Assert */
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('O.4 uploads dir missing → method ends without error', async () => {
      /* Arrange */
      const { service } = makeDeps();
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      /* Act & Assert */
      await expect(service.scanOrphanFiles()).resolves.toBeUndefined();
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });
});
