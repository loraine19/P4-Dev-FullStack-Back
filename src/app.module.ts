import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CronTaskModule } from './cron-task/cron-task.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoggerModule,
    AuthModule,
    CronTaskModule,
  ],
})
export class AppModule {}
