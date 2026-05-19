import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import type { MulterFile } from './interfaces/multer-file.interface';
import type { IFileResponse } from './interfaces/file-response.interface';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) =>
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
};

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /* UPLOAD */
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async upload(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<IApiResponse<IFileResponse>> {
    const data = await this.filesService.upload(file, dto, user.sub);
    return ApiResponse.success('Fichier uploadé', data);
  }

  /* UPLOAD ANONYMOUS */
  @Post('anonymous')
  @HttpCode(201)
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadAnonymous(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: IJwtPayload | null,
  ): Promise<IApiResponse<IFileResponse>> {
    const data = await this.filesService.upload(file, dto, user?.sub);
    return ApiResponse.success('Fichier uploadé', data);
  }

  /* FIND ALL */
  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: IJwtPayload): Promise<IApiResponse<IFileResponse[]>> {
    const data = await this.filesService.findAll(user.sub);
    return ApiResponse.success('Fichiers récupérés', data);
  }

  /* REMOVE */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IJwtPayload,
  ): Promise<void> {
    await this.filesService.remove(id, user.sub);
  }
}
