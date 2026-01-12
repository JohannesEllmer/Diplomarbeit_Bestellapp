import { IsUUID } from 'class-validator';

export class SelectMealPlanDto {
  @IsUUID('all')
  id!: string;
}
