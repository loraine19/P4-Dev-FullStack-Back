import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CronTaskModule } from './cron-task/cron-task.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    CronTaskModule,
  ],
})
export class AppModule {}
