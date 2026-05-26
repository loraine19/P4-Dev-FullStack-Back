import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value as string, 10) : undefined))
  @IsInt()
  @Min(1)
  @Max(7) // US10
  expirationDays?: number;

  @IsOptional()
  @IsString()
  @MinLength(6) // US09
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

