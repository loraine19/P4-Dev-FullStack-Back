import {
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { DownloadDto } from './dto/download.dto';
import type { IDownloadMeta } from './interfaces/download-meta.interface';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DownloadService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* GET META */
  async getMeta(shareToken: string): Promise<IDownloadMeta> {
    const file = await this.prisma.file.findUnique({ where: { shareToken } });
    if (!file) throw new NotFoundException(ERROR_MESSAGES.DOWNLOAD.NOT_FOUND);
    if (file.expiresAt < new Date()) throw new GoneException(ERROR_MESSAGES.DOWNLOAD.EXPIRED);
    return {
      filename: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      requiresPassword: !!file.downloadPasswordHash,
    };
  }

  /* DOWNLOAD */
  async download(shareToken: string, dto: DownloadDto, res: Response): Promise<StreamableFile> {
    const { password } = dto;

    const file = await this.prisma.file.findUnique({ where: { shareToken } });
    if (!file) throw new NotFoundException(ERROR_MESSAGES.DOWNLOAD.NOT_FOUND);
    if (file.expiresAt < new Date()) throw new GoneException(ERROR_MESSAGES.DOWNLOAD.EXPIRED);

    if (file.downloadPasswordHash) {
      if (!password) throw new UnauthorizedException(ERROR_MESSAGES.DOWNLOAD.BAD_PASSWORD);
      const valid = await bcrypt.compare(password, file.downloadPasswordHash);
      if (!valid) throw new UnauthorizedException(ERROR_MESSAGES.DOWNLOAD.BAD_PASSWORD);
    }

    const filePath = path.join(this.uploadsDir, file.filename);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    });

    this.logger.log(`File downloaded: ${file.filename}`, DownloadService.name);
    return new StreamableFile(fs.createReadStream(filePath));
  }
}
