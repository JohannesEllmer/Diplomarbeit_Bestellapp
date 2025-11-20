import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  private orders: Order[] = [];

  create(createOrderDto: CreateOrderDto): Order {
    const newOrder: Order = {
      id: Date.now().toString(),
      // map user -> userId; fallback to allow payloads that already have userId
      userId: createOrderDto.user?.id ?? (createOrderDto as any)['userId'],
      items: createOrderDto.items,
      totalPrice: createOrderDto.totalPrice,
      createdAt: createOrderDto.createdAt,
      status: createOrderDto.status,
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  findAll(): Order[] {
    return this.orders;
  }

  findOne(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  remove(id: string): { deleted: boolean } {
    this.orders = this.orders.filter(o => o.id !== id);
    return { deleted: true };
  }

  update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = this.orders.find(o => o.id === id);
    if (!order) return undefined;
    Object.assign(order, updateOrderDto);
    return order;
  }
}
