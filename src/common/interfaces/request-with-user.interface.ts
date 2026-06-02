import type { Request } from 'express';
import type { IJwtPayload } from './jwt-payload.interface';

/* IREQUEST WITH USER */
export interface IRequestWithUser extends Request {
  user: IJwtPayload | null;
}

