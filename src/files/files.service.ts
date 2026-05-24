import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { UploadFileDto } from './dto/upload-file.dto';
import type { IFileResponse } from './interfaces/file-response.interface';
import type { MulterFile } from './interfaces/multer-file.interface';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private readonly uploadsDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* HELPER */
  private toFileResponse(
    file: {
      id: number;
      originalName: string;
      size: number;
      mimeType: string;
      shareToken: string;
      downloadPasswordHash: string | null;
      expiresAt: Date;
      createdAt: Date;
      fileTags?: { tag: { id: number; name: string } }[];
    },
  ): IFileResponse {
    return {
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      shareToken: file.shareToken,
      passwordProtected: !!file.downloadPasswordHash,
      expiresAt: file.expiresAt,
      createdAt: file.createdAt,
      tags: file.fileTags?.map((ft) => ({ id: ft.tag.id, name: ft.tag.name })) ?? [],
    };
  }

  /* UPLOAD */
  /* RESOLVE ORIGINAL NAME HELPER */
  private async resolveOriginalName(rawName: string, userId?: number): Promise<string> {
    const ext = path.extname(rawName);
    const base = path.basename(rawName, ext);

    const existing = await this.prisma.file.count({
      where: {
        userId: userId ?? null,
        originalName: { startsWith: base },
      },
    });

    // no duplicate → keep as-is
    if (existing === 0) return rawName;

    // find first free index: file(1).txt, file(2).txt, …
    for (let i = 1; i <= existing + 1; i++) {
      const candidate = `${base}(${i})${ext}`;
      const taken = await this.prisma.file.count({
        where: { userId: userId ?? null, originalName: candidate },
      });
      if (taken === 0) return candidate;
    }
    // unreachable: loop always finds a slot (pigeonhole principle)
    return rawName;
  }

  async upload(file: MulterFile, dto: UploadFileDto, userId?: number): Promise<IFileResponse> {
    const { expirationDays, downloadPassword, tags } = dto;

    if (tags?.length && userId !== undefined) {
      for (const tagId of tags) {
        const tag = await this.prisma.tag.findFirst({ where: { id: tagId, userId } });
        if (!tag) throw new BadRequestException(ERROR_MESSAGES.FILES.INVALID_TAG);
      }
    }

    const shareToken = crypto.randomUUID();
    const downloadPasswordHash = downloadPassword
      ? await bcrypt.hash(downloadPassword, 10)
      : null;
    const expiresAt = new Date(Date.now() + (expirationDays ?? 7) * 86_400_000);
    const originalName = await this.resolveOriginalName(file.originalname, userId);

    const created = await this.prisma.$transaction(async (tx) => {
      const newFile = await tx.file.create({
        data: {
          userId: userId ?? null,
          filename: file.filename,
          originalName,
          size: file.size,
          mimeType: file.mimetype,
          shareToken,
          downloadPasswordHash,
          expiresAt,
        },
      });

      if (tags?.length) {
        await tx.fileTag.createMany({
          data: tags.map((tagId) => ({ fileId: newFile.id, tagId })),
        });
      }

      return newFile;
    });

    this.logger.log(`File uploaded: ${created.filename}`, FilesService.name);
    return this.toFileResponse(created);
  }

  /* FIND ALL */
  async findAll(userId: number): Promise<IFileResponse[]> {
    const files = await this.prisma.file.findMany({
      where: { userId },
      include: { fileTags: { include: { tag: true } } },
    });
    return files.map((f) => this.toFileResponse(f));
  }

  /* REMOVE */
  async remove(id: number, userId: number): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException(ERROR_MESSAGES.FILES.NOT_FOUND);
    if (file.userId !== userId) throw new ForbiddenException(ERROR_MESSAGES.FILES.FORBIDDEN);

    const filePath = path.join(this.uploadsDir, file.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await this.prisma.file.delete({ where: { id } });
    this.logger.log(`File deleted: ${file.filename}`, FilesService.name);
  }
}
