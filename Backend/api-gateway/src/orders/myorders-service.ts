// src/orders/my-orders.service.ts
import { Injectable } from '@nestjs/common';
import { OrdersBridgeService } from './orders.bridge.service';
import { CreateOrderDto, OrderDto } from './dto/order.dto';

@Injectable()
export class MyOrdersService {
  constructor(private readonly bridge: OrdersBridgeService) {}

  getMyOrders(userId: string): Promise<OrderDto[]> {
    return this.bridge.getMyOrders(userId);
  }

  createOrder(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    return this.bridge.createOrderForUser(userId, dto.items);
  }
}
