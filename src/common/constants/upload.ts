/* UPLOAD CONSTANTS */
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES ?? String(1024 * 1024 * 1024), 10);

export const DEFAULT_EXPIRATION_DAYS = parseInt(process.env.DEFAULT_EXPIRATION_DAYS ?? '7', 10);

export const FORBIDDEN_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'sh', 'jar', 'app', 'dmg', 'vbs',
]);
