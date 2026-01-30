import { UserRefDto } from './user-ref.dto';

export class OrderMenuItemDto {
  id!: string;
  name!: string;
  description!: string;
  price!: number;
  category!: string;
  available!: boolean;
  vegetarian!: boolean;
  allergens!: string[];
  drink?: string;
  dessert?: string;
}

export class OrderItemResponseDto {
  menuItem!: OrderMenuItemDto;
  user!: UserRefDto;
  note!: string;
  quantity!: number;
  delivered?: boolean;
  deliveryTime?: string;
}

export class OrderResponseDto {
  id!: string;
  user!: UserRefDto;
  items!: OrderItemResponseDto[];
  totalPrice!: number;
  createdAt!: string; // ISO string
  status!: 'open' | 'closed';
  qrCodeUrl?: string;
}
