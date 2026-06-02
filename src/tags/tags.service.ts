import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages';
import { CreateTagDto } from './dto/create-tag.dto';
import type { ITagResponse } from './interfaces/tag-response.interface';
import type { IAttachToFileParams } from './interfaces/attach-to-file-params.interface';

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /* FIND ALL */
  async findAll(userId: number): Promise<ITagResponse[]> {
    const tags = await this.prisma.tag.findMany({ where: { userId } });
    return tags.map(({ id, name }) => ({ id, name }));
  }

  /* ATTACH TO FILE */
  async attachToFile({ fileId, tagIds, userId, tx }: IAttachToFileParams): Promise<void> {
    const uniqueTagIds = [...new Set(tagIds)];
    const validTags = await tx.tag.findMany({ where: { id: { in: uniqueTagIds }, userId } });
    if (validTags.length !== uniqueTagIds.length) throw new BadRequestException(ERROR_MESSAGES.TAGS.NOT_FOUND);
    await tx.fileTag.createMany({
      data: uniqueTagIds.map((tagId) => ({ fileId, tagId })),
      skipDuplicates: true,
    });
  }

  /* CREATE */
  async create(dto: CreateTagDto, userId: number): Promise<ITagResponse> {
    const { name } = dto;
    const exists = await this.prisma.tag.findFirst({ where: { name, userId } });
    if (exists) throw new ConflictException(ERROR_MESSAGES.TAGS.CONFLICT);
    const tag = await this.prisma.tag.create({ data: { name, userId } });
    return { id: tag.id, name: tag.name };
  }

  /* REMOVE */
  async remove(id: number, userId: number): Promise<void> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException(ERROR_MESSAGES.TAGS.NOT_FOUND);
    if (tag.userId !== userId) throw new ForbiddenException(ERROR_MESSAGES.TAGS.FORBIDDEN);
    await this.prisma.tag.delete({ where: { id } });
    this.logger.log(`Tag deleted: ${tag.name}`, TagsService.name);
  }
}
