import { PartialType } from '@nestjs/mapped-types';
import { CreateMealPlanDto } from './create-mealplan.dto';

export class UpdateMealPlanDto extends PartialType(CreateMealPlanDto) {}
