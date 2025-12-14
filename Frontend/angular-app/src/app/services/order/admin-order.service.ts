import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../env';
import { Order, OrderItem } from '../../../models/menu-item.model';

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly adminOrdersEndpoint = `${this.apiBase}/admin/orders`;
  private readonly userOrdersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  getOrdersFlatItems(): Observable<OrderItem[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<Order[]>(this.adminOrdersEndpoint).pipe(
      map((orders) => (orders ?? []).flatMap(o => (o.items ?? []) as any)),
      catchError(err => {
        console.error('admin getOrders failed:', err);
        return of([]);
      })
    );
  }

  // ✅ Backend: PATCH /api/admin/orders/:id { status? , items? }
  setOrderStatus(orderId: string, status: 'open' | 'closed'): Observable<Order> {
    if (environment.useMockData) return of({} as any);
    return this.http.patch<Order>(`${this.adminOrdersEndpoint}/${orderId}`, { status }).pipe(
      catchError(err => {
        console.error('setOrderStatus failed:', err);
        return of({} as any);
      })
    );
  }

  deleteOrder(orderId: string): Observable<void> {
    if (environment.useMockData) return of(void 0);

    return this.http.delete<void>(`${this.adminOrdersEndpoint}/${orderId}`).pipe(
      catchError(err => {
        console.error('deleteOrder failed:', err);
        return of(void 0);
      })
    );
  }

  completeByQrCode(code: string): Observable<{ ok: boolean; order?: any }> {
    if (environment.useMockData) return of({ ok: true });

    return this.http.patch<{ ok: boolean; order?: any }>(
      `${this.adminOrdersEndpoint}/complete`,
      { code }
    ).pipe(
      catchError(err => {
        console.error('completeByQrCode failed:', err);
        return of({ ok: false } as any);
      })
    );
  }

  createOrderFromItem(orderItem: OrderItem): Observable<Order> {
    if (environment.useMockData) return of({} as any);

    const payload = {
      items: [
        {
          menuItemId: orderItem.menuItem.id,
          quantity: orderItem.quantity,
          note: orderItem.note ?? ''
        }
      ]
    };

    return this.http.post<Order>(this.userOrdersEndpoint, payload).pipe(
      catchError(err => {
        console.error('createOrderFromItem failed:', err);
        return of({} as any);
      })
    );
  }
}
