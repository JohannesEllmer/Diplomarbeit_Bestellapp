import { User } from "./user.model";

export interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];
  image: string | ArrayBuffer | null;
}

export interface OrderItem {
  menuItem: MenuItem;
  user: User;
  note: string;
  quantity: number;
  delivered?: boolean;
  deliveryTime?: string;
}
