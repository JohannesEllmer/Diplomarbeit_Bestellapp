import { Injectable } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class MyOrdersService {
  constructor(private readonly orders: OrdersService) {}

  getMyOrders(userId: string) {
    return this.orders.getMyOrders(userId);
  }

  createOrder(userId: string, dto: CreateOrderDto) {
    return this.orders.createForUser(userId, dto);
  }
}
