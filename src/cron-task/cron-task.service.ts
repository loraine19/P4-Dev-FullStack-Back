import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CronTaskService {
  private readonly logger = new Logger(CronTaskService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {}

  /// DELETE EXPIRED FILES
  // Runs every hour — deletes files whose expiresAt is in the past
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredFiles() {
    const expiredFiles = await this.prisma.file.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    for (const file of expiredFiles) {
      const filePath = path.join(this.uploadsDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted expired file from disk: ${file.filename}`);
      }
    }

    const { count } = await this.prisma.file.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired file(s) from database`);
    }
  }
}
