import { IsString, IsOptional, IsIn, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateQaCheckDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  testTitle?: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsIn(['pending', 'passed', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tester?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
