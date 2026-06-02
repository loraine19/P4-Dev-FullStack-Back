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
import { ApiResponse, type IApiResponse } from '../common/helpers/api-response';
import { SUCCESS_MESSAGES } from '../common/constants/success-messages';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /* FIND ALL */
  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() userId: number): Promise<IApiResponse<ITagResponse[]>> {
    const data = await this.tagsService.findAll(userId);
    return ApiResponse.success(SUCCESS_MESSAGES.TAGS.LIST, data);
  }

  /* CREATE */
  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() userId: number,
  ): Promise<IApiResponse<ITagResponse>> {
    const data = await this.tagsService.create(dto, userId);
    return ApiResponse.success(SUCCESS_MESSAGES.TAGS.CREATED, data);
  }

  /* REMOVE */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() userId: number,
  ): Promise<void> {
    await this.tagsService.remove(id, userId);
  }
}
