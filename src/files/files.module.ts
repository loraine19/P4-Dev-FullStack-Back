import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LoggerModule, AuthModule],
  controllers: [FilesController],
  providers: [FilesService, PrismaService],
  exports: [FilesService],
})
export class FilesModule {}
