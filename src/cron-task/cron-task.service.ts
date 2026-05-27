import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CronTaskService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* DELETE EXPIRED FILES */
  // runs every hour -  removes expired files from disk then from database
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredFiles() {
    const expiredFiles = await this.prisma.file.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    for (const file of expiredFiles) {
      const filePath = path.join(this.uploadsDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted expired file from disk: ${file.filename}`, CronTaskService.name);
      }
    }

    const { count } = await this.prisma.file.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired file(s) from database`, CronTaskService.name);
    }
  }
}
