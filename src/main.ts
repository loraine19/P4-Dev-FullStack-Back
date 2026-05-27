import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ErrorFilter } from './common/filters/error.filter';
import { MulterExceptionFilter } from './common/filters/multer-exception.filter';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(LoggerService);

  app.useLogger(logger);
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // NestJS routes each exception to the most specific @Catch() type -  registration order does not matter
  app.useGlobalFilters(
    new PrismaExceptionFilter(logger),
    new MulterExceptionFilter(logger),
    new ErrorFilter(logger),
    new HttpExceptionFilter(logger),
  );

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
