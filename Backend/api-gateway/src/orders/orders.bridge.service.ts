// src/orders/orders-bridge.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateOrderItemDto, OrderDto } from './dto/order.dto';

@Injectable()
export class OrdersBridgeService {
  private readonly baseUrl: string;

  constructor(private readonly http: HttpService) {
    // Basis-URL zum DB-Service (HTTP, nicht direkt Postgres!)
    // z.B. im api-gateway/.env:
    // ORDERS_API_URL=http://db-service:6666   (oder http://localhost:6666)
    this.baseUrl = (process.env.ORDERS_API_URL ?? 'http://localhost:6666').replace(/\/$/, '');
  }

  // -------- User-spezifische Orders (RLS über Header x-user-id) --------

  async getMyOrders(userId: string): Promise<OrderDto[]> {
    const res = await firstValueFrom(
      this.http.get<OrderDto[]>(`${this.baseUrl}/orders/my`, {
        headers: { 'x-user-id': userId },
      }),
    );
    return res.data;
  }

  async createOrderForUser(
    userId: string,
    items: CreateOrderItemDto[],
  ): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.post<OrderDto>(
        `${this.baseUrl}/orders`,
        { items },
        { headers: { 'x-user-id': userId } },
      ),
    );
    return res.data;
  }

  // -------- Admin-/globale Orders --------

  async getAllOrders(): Promise<OrderDto[]> {
    const res = await firstValueFrom(
      this.http.get<OrderDto[]>(`${this.baseUrl}/orders`),
    );
    return res.data;
  }

  async getOrderById(id: string): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.get<OrderDto>(`${this.baseUrl}/orders/${id}`),
    );
    return res.data;
  }

  async updateOrder(
    id: string,
    payload: Partial<Pick<OrderDto, 'status' | 'items'>>,
  ): Promise<OrderDto> {
    const res = await firstValueFrom(
      this.http.patch<OrderDto>(`${this.baseUrl}/orders/${id}`, payload),
    );
    return res.data;
  }

  async deleteOrder(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/orders/${id}`));
  }
}
