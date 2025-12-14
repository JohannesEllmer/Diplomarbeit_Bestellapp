import { UserRefDto } from './user-ref.dto';
import { MenuItemDto } from './menu-item.dto';

export class OrderItemResponseDto {
  menuItem!: MenuItemDto;
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
  createdAt!: string; // ISO
  status!: 'open' | 'closed';
  qrCodeUrl?: string;
}
