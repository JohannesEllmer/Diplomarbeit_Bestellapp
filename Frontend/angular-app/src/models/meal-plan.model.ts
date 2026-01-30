import { MenuItem } from './menu-item.model';

export interface MealPlan {
  id: string;
  title: string;
  isSelected?: boolean;
  menuItems: MenuItem[];
}
