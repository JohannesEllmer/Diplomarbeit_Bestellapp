import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMealPlanDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  menuItemIds?: string[];
}
