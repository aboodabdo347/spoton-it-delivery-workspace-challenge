import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateWorkItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['feature', 'bug', 'improvement', 'maintenance'])
  type: string;

  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
