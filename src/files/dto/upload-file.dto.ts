import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  expirationDays?: number;

  @IsOptional()
  @IsString()
  downloadPassword?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  tags?: number[];
}

