import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/* PRISMA MODULE */
// @Global makes PrismaService available in all modules without explicit import
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
