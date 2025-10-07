import { Dish } from './dish.model';

export interface Menu {
  title: string;
  dishes: Dish[];
}
