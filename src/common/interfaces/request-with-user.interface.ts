import { Request } from 'express';
import { IJwtPayload } from './jwt-payload.interface';

/* IREQUEST WITH USER */
export interface IRequestWithUser extends Request {
  user: IJwtPayload | null;
}

