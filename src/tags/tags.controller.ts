import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import type { ITagResponse } from './interfaces/tag-response.interface';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { IJwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /* FIND ALL */
  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: IJwtPayload): Promise<IApiResponse<ITagResponse[]>> {
    const data = await this.tagsService.findAll(user.sub);
    return ApiResponse.success('Tags récupérés', data);
  }

  /* CREATE */
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() user: IJwtPayload,
  ): Promise<IApiResponse<ITagResponse>> {
    const data = await this.tagsService.create(dto, user.sub);
    return ApiResponse.success('Tag créé', data);
  }

  /* REMOVE */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: IJwtPayload,
  ): Promise<void> {
    await this.tagsService.remove(id, user.sub);
  }
}
