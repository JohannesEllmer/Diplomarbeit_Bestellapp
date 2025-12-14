import { IsString } from 'class-validator';

export class CreateMealPlanDto {
  @IsString()
  title!: string;
}
