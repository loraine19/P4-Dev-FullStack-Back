import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronTaskModule } from './cron-task/cron-task.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CronTaskModule,
  ],
})
export class AppModule {}
