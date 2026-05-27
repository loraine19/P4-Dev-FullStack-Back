import { CronTaskService } from './cron-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));
import * as fs from 'fs';

/* FACTORIES */
const makeDeps = () => {
  const prisma = {
    file: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService;
  const service = new CronTaskService(prisma, logger);
  return { service, prisma, logger };
};

describe('CronTaskService', () => {
  describe('deleteExpiredFiles()', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    it('F.1 fichiers expirés présents → fs.unlinkSync + prisma.deleteMany appelés', async () => {
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
      expect(prisma.file.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it('F.2 fichier expiré absent du disque → unlinkSync non appelé, deleteMany quand même', async () => {
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

    it('F.3 aucun fichier expiré → deleteMany appelé, count = 0, pas de log', async () => {
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
});
