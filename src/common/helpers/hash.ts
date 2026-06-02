import * as bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '../constants/security';

/* HASH PASSWORD */
export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_ROUNDS);

/* COMPARE PASSWORD */
export const comparePassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
