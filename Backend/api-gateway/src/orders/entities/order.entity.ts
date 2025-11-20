import { CreateOrderItemDto } from '../dto/create-order-item.dto';

export class Order {
  id: string;
  userId: string;
  items: CreateOrderItemDto[];
  totalPrice: number;
  createdAt: string;
  status: 'open' | 'closed';
}