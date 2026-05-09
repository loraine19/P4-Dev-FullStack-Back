import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronTaskService } from './cron-task.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ScheduleModule],
  providers: [CronTaskService, PrismaService],
})
export class CronTaskModule {}
