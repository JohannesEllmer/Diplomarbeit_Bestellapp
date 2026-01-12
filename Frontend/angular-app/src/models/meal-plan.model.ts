import { Dish } from './dish.model';

export interface MealPlan {
  id: string;
  title: string;
  dishes: Dish[];

  // optional, je nach deinem Backend
  isSelected?: boolean;
}

