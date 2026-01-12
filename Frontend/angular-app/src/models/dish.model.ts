export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;

  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];
}
