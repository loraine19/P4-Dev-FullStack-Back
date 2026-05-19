import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value as string, 10) : undefined))
  @IsInt()
  @Min(1)
  expirationDays?: number;

  @IsOptional()
  @IsString()
  downloadPassword?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr.map((v: string) => parseInt(v, 10));
  })
  @IsArray()
  @IsInt({ each: true })
  tags?: number[];
}

