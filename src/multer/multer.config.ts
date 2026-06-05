import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE } from '../common/constants/upload';
import { UPLOADS_DIR } from '../common/constants/paths';

/* FILENAME STRATEGY */
const generateFilename = (_req, file, cb) =>
  cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);

/* EXTENSION FILTER */
const filterExtension = (_req, file, cb) => {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  if (!ext || FORBIDDEN_EXTENSIONS.has(ext))
    return cb(new BadRequestException(ERROR_MESSAGES.FILES.INVALID_EXTENSION), false);
  cb(null, true);
};

/* MULTER OPTIONS */
export const multerOptions = {
  storage: diskStorage({ destination: UPLOADS_DIR, filename: generateFilename }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: filterExtension,
};
