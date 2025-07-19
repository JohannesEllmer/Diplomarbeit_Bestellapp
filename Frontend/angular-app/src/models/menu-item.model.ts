export interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];
  imageUrl: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  note: string;
  quantity: number;
}