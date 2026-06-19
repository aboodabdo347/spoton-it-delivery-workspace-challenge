import { IsString, IsOptional, IsIn, IsDateString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(['draft', 'scheduled', 'deployed', 'rolled_back'])
  deploymentStatus?: string;
}
