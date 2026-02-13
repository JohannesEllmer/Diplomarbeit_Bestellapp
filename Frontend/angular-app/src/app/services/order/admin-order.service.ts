import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../env';
import { Order } from '../../../models/menu-item.model';

@Injectable({ providedIn: 'root' })
export class AdminOrderService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly adminOrdersEndpoint = `${this.apiBase}/admin/orders`;
  private readonly userOrdersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<Order[]>(this.adminOrdersEndpoint).pipe(
      catchError(err => {
        console.error('admin getOrders failed:', err);
        return of([]);
      })
    );
  }

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

  // Falls du das noch brauchst, kannst du es lassen:
  createOrderFromItem(orderItem: any): Observable<Order> {
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
