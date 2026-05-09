import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {}
}
