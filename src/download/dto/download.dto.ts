import { IsOptional, IsString, MinLength } from 'class-validator';
import { FILE_PASSWORD_MIN_LENGTH } from '../../common/constants/security';

export class DownloadDto {
  @IsOptional()
  @IsString()
  @MinLength(FILE_PASSWORD_MIN_LENGTH)
  password?: string;
}

