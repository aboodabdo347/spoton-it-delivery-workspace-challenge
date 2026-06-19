import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateQaCheckDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  testTitle: string;

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tester?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
