import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateMealPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  dishIds?: string[];


}
