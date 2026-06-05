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
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import type { MulterFile } from './interfaces/multer-file.types';
import type { IFileResponse } from './interfaces/file-response.interface';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';
import { SUCCESS_MESSAGES } from '../common/constants/success-messages';
import { multerOptions } from '../multer/multer.config';

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
    @CurrentUser() userId: number,
  ): Promise<IApiResponse<IFileResponse>> {
    const data = await this.filesService.upload(file, dto, userId);
    return ApiResponse.success(SUCCESS_MESSAGES.FILES.UPLOADED, data);
  }

  /* UPLOAD ANONYMOUS */
  @Post('anonymous')
  @HttpCode(201)
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadAnonymous(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadFileDto,
    @CurrentUser() userId: number | null,
  ): Promise<IApiResponse<IFileResponse>> {
    const data = await this.filesService.upload(file, dto, userId ?? undefined);
    return ApiResponse.success(SUCCESS_MESSAGES.FILES.UPLOADED, data);
  }

  /* FIND ALL */
  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() userId: number): Promise<IApiResponse<IFileResponse[]>> {
    const data = await this.filesService.findAll(userId);
    return ApiResponse.success(SUCCESS_MESSAGES.FILES.LIST, data);
  }

  /* REMOVE */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() userId: number,
  ): Promise<void> {
    await this.filesService.remove(id, userId);
  }
}
