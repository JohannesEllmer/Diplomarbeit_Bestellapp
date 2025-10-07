import { MenuItem } from './menu-item.model';

export interface Menu {
  title: string;
  dish: MenuItem;
  drink?: string;
  dessert?: string;
}
