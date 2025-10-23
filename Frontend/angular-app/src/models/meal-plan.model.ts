import { Dish } from './dish.model';

export interface MealPlan {
  title: string;
  dishes: Dish[];
}
