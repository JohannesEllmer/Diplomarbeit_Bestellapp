import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class SetMealPlanDishesDto {
  @IsArray()
  @IsUUID('all', { each: true })
  dishIds!: string[];

}
