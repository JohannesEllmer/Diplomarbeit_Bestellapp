import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly baseUrl: string;

  constructor(private readonly http: HttpService) {
    // URL der NestJS+Postgres-Instanz
    // z.B. ORDERS_SERVICE_URL=http://orders-db-service:3001
    this.baseUrl = (process.env.ORDERS_SERVICE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  }

  // ---------- User-spezifische Orders (RLS via x-user-id) ----------

  async getMyOrders(userId: string): Promise<OrderDto[]> {
    const res = await firstValueFrom(
      this.http.get<OrderDto[]>(`${this.baseUrl}/orders/my`, {
        headers: {
          'x-user-id': userId,
        },
      }),
    );
    return res.data;
  }

  async createForUser(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.post<OrderDto>(`${this.baseUrl}/orders`, dto, {
        headers: {
          'x-user-id': userId,
        },
      }),
    );
    return res.data;
  }

  // ---------- Admin / generische Endpoints ----------

  async findAll(): Promise<OrderDto[]> {
    const res = await firstValueFrom(
      this.http.get<OrderDto[]>(`${this.baseUrl}/orders`),
    );
    return res.data;
  }

  async findOne(id: string): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.get<OrderDto>(`${this.baseUrl}/orders/${id}`),
    );
    return res.data;
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.patch<OrderDto>(`${this.baseUrl}/orders/${id}`, dto),
    );
    return res.data;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/orders/${id}`));
  }
}
