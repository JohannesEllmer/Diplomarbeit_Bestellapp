// src/orders/admin-orders.service.ts
import { Injectable } from '@nestjs/common';
import { OrdersBridgeService } from './orders.bridge.service';
import { OrderDto } from './dto/order.dto';

@Injectable()
export class AdminOrdersService {
  constructor(private readonly bridge: OrdersBridgeService) {}

  findAll(): Promise<OrderDto[]> {
    return this.bridge.getAllOrders();
  }

  findOne(id: string): Promise<OrderDto> {
    return this.bridge.getOrderById(id);
  }

  update(
    id: string,
    partial: Partial<Pick<OrderDto, 'status' | 'items'>>,
  ): Promise<OrderDto> {
    return this.bridge.updateOrder(id, partial);
  }

  remove(id: string): Promise<void> {
    return this.bridge.deleteOrder(id);
  }
}
