import { Module } from '@nestjs/common';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [DownloadController],
  providers: [DownloadService, PrismaService],
})
export class DownloadModule {}
