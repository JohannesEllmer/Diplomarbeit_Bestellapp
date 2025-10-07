import { User } from "./user.model";

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];
}

export interface OrderItem {
  menuItem: MenuItem;
  user: User;
  note: string;
  quantity: number;
  
  delivered?: boolean;
  deliveryTime?: string;
}


export interface Order {
  id: number;
  user: User;
  items: OrderItem[];
  totalPrice: number;
  createdAt: Date;
  status: "open" | "closed";
  showDetails?: boolean;
}
