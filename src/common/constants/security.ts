/* SECURITY CONSTANTS */
// bcrypt cost factor - configurable per environment, never below 10 in production
export const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);
export const PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH ?? '8', 10);
export const FILE_PASSWORD_MIN_LENGTH = parseInt(process.env.FILE_PASSWORD_MIN_LENGTH ?? '6', 10);

/* JWT */
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

/* COOKIE */
export const COOKIE_NAME = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
export const COOKIE_MAX_AGE = parseInt(process.env.COOKIE_MAX_AGE ?? '604800000', 10);
