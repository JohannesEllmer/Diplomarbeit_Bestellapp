import { IsArray, IsUUID } from 'class-validator';

export class SetMealPlanDishesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  dishIds!: string[];
}
