import { IsArray, IsUUID } from 'class-validator';

export class LinkItemsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  workItemIds: string[];
}
