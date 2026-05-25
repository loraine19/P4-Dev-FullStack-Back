import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CronTaskModule } from './cron-task/cron-task.module';
import { LoggerModule } from './common/logger/logger.module';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { FilesModule } from './files/files.module';
import { TagsModule } from './tags/tags.module';
import { DownloadModule } from './download/download.module';

@Module({
  imports: [ScheduleModule.forRoot(), LoggerModule, AuthModule, CronTaskModule, FilesModule, TagsModule, DownloadModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*path}');
  }
}
