import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { UPLOADS_DIR } from '../common/constants/paths';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CronTaskService {
  private readonly uploadsDir = UPLOADS_DIR;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* DELETE EXPIRED FILES */
  // runs once per night at 2am - removes expired records from DB first, then cleans disk
  // DB deletion is committed before touching disk so a disk failure leaves orphans (handled by scanOrphanFiles)
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deleteExpiredFiles() {
    const expiredFiles = await this.prisma.file.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (expiredFiles.length === 0) return;

    const { count } = await this.prisma.file.deleteMany({
      where: { id: { in: expiredFiles.map((f) => f.id) } },
    });

    this.logger.log(`Cleaned up ${count} expired file(s) from database`, CronTaskService.name);

    for (const file of expiredFiles) {
      const filePath = path.join(this.uploadsDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted expired file from disk: ${file.filename}`, CronTaskService.name);
      }
    }
  }

  /* SCAN ORPHAN FILES */
  // runs once per night at 3am - staggered from deleteExpiredFiles to avoid concurrent DB+disk contention
  // deletes files on disk not referenced in DB for more than 7 days
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scanOrphanFiles() {
    if (!fs.existsSync(this.uploadsDir)) return;

    const filenames = fs.readdirSync(this.uploadsDir);
    const now = Date.now();

    for (const filename of filenames) {
      const filePath = path.join(this.uploadsDir, filename);
      const stat = fs.statSync(filePath);
      // skip if file is not old enough to be considered orphan
      if (now - stat.mtimeMs < SEVEN_DAYS_MS) continue;

      const inDb = await this.prisma.file.findFirst({ where: { filename } });
      if (!inDb) {
        fs.unlinkSync(filePath);
        this.logger.warn(`Deleted orphan file (not in DB, >7d on disk): ${filename}`, CronTaskService.name);
      }
    }
  }
}
