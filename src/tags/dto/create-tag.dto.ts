import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(30) // US08
  name: string;
}

