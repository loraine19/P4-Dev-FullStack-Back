import { Module } from '@nestjs/common';
import { CronTaskService } from './cron-task.service';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [CronTaskService],
})
export class CronTaskModule {}
