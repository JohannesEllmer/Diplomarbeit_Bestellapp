import { Dish } from './dish.model';

export interface MealPlan {
  id: string;
  title: string;
  dishes: Dish[];
}
