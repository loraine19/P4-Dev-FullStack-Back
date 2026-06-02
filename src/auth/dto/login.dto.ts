import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../common/constants/security';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password: string;

  @IsBoolean()
  @IsOptional()
  isMobile?: boolean;
}

