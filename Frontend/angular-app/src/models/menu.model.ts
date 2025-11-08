import { MenuItem } from './menu-item.model';

export interface Menu {
  id: string;
  title: string;
  dish: MenuItem;
  drink?: string;
  dessert?: string;
}
