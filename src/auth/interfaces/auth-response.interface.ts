import type { IUserPublic } from './user-public.interface';

/* IAUTH RESPONSE */
export interface IAuthResponse {
  user: IUserPublic;
  access_token?: string;
}

