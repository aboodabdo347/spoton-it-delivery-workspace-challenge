import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
