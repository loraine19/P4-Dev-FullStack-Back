import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  /* USE */
  use(req: Request, res: Response, next: NextFunction) {
    const { method, url } = req;
    res.on('finish', () => {
      this.logger.log(`${method} ${url} → ${res.statusCode}`, LoggerMiddleware.name);
    });
    next();
  }
}
