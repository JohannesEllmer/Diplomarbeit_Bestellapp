import { IsArray, IsUUID } from 'class-validator';

export class SetMealPlanMenuItemsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  menuItemIds!: string[];
}
