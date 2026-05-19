import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StreamableFile } from '@nestjs/common';
import { DownloadService } from './download.service';
import { DownloadDto } from './dto/download.dto';
import type { IDownloadMeta } from './interfaces/download-meta.interface';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  /* GET META */
  @Get(':token')
  @HttpCode(200)
  async getMeta(@Param('token') token: string): Promise<IApiResponse<IDownloadMeta>> {
    const data = await this.downloadService.getMeta(token);
    return ApiResponse.success('Métadonnées récupérées', data);
  }

  /* DOWNLOAD */
  @Post(':token')
  @HttpCode(200)
  async download(
    @Param('token') token: string,
    @Body() dto: DownloadDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return this.downloadService.download(token, dto, res);
  }
}
