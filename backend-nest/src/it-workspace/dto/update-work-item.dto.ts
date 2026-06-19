import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class UpdateWorkItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['feature', 'bug', 'improvement', 'maintenance'])
  type?: string;

  @IsOptional()
  @IsIn(['backlog', 'planned', 'in_progress', 'qa', 'ready_for_release', 'released'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
