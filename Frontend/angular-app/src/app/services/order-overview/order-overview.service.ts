import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../env';
import { Order } from '../../../models/menu-item.model';
import { AuthService } from '../AuthService';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  getMyOrders(): Observable<Order[]> {
    const currentUserId = this.auth.getCurrentUserId();

    return this.http.get<Order[]>(this.ordersEndpoint).pipe(
      map(orders => {
        const safeOrders = orders ?? [];
        const filtered = safeOrders.filter(o =>
          (o.user as any)?.id === currentUserId ||
          (o as any).userId === currentUserId,
        );

        return this.addQrForOpenOrders(filtered);
      }),
      catchError(error => {
        console.error('Fehler beim Laden der eigenen Bestellungen', error);
        return throwError(() => error);
      }),
    );
  }

  addQrForOpenOrders(orders: Order[]): Order[] {
    return orders.map(o => ({
      ...o,
      qrCodeUrl: o.status === 'open' ? this.generateQrCode(o.id) : undefined,
    }));
  }

  generateQrCode(orderId: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-${orderId}`;
  }
}
