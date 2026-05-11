import { Module } from '@nestjs/common';
import { CronTaskService } from './cron-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [CronTaskService, PrismaService],
})
export class CronTaskModule {}
