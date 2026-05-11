import { IsOptional, IsString } from 'class-validator';

export class DownloadDto {
  @IsOptional()
  @IsString()
  password?: string;
}

