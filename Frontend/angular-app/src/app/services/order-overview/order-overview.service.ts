import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, delay, catchError } from 'rxjs';
import { environment } from '../env';
import { Order } from '../../../models/menu-item.model';
import { AuthService } from '../AuthService';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly apiBase = environment.apiBaseUrl ?? 'https://your-backend-api.com';

  /**
   * Lädt ausschließlich Bestellungen des eingeloggten Users.
   * Bevorzugt /orders/my (Backend kümmert sich um Filter).
   * Fallback: /orders?userId=... (wenn dein Backend so arbeitet).
   */
  getMyOrders(): Observable<Order[]> {
    if (environment.useMockData) {
      return this.getMyOrdersMock();
    }

    // Option A (empfohlen): geschütztes Endpoint für eigene Bestellungen
    const urlA = `${this.apiBase}/orders/my`;

    // Option B (falls A nicht existiert): mit userId filtern
    const userId = this.auth.getCurrentUserId();
    const urlB = `${this.apiBase}/orders?userId=${userId}`;

    const url = environment.endpoints?.ordersMy ?? urlA; // falls du per env umschalten willst

    return this.http.get<Order[]>(url).pipe(
      catchError(() => this.http.get<Order[]>(urlB)),
      map(orders => (orders ?? []).map(o => ({
        ...o,
        // Sicherheitsnetz: niemals fremde Orders durchlassen
        // (falls Backend fälschlich mehr zurückgibt)
        // @ts-ignore – abhängig von deinem Order-Model
        user: o.user,
      })).filter(o => o.user?.id === this.auth.getCurrentUserId()))
    );
  }

  /** Hilfsfunktion fürs UI: QR nur für offene Bestellungen. */
  addQrForOpenOrders(orders: Order[]): Order[] {
    return orders.map(o => ({
      ...o,
      qrCodeUrl: o.status === 'open'
        ? this.generateQrCode(o.id)
        : undefined
    }));
  }

  generateQrCode(orderId: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-${orderId}`;
  }

  /** Mock-Daten für lokale Entwicklung / Storybook */
  private getMyOrdersMock(): Observable<Order[]> {
    const userId = this.auth.getCurrentUserId();

    const mock: Order[] = [
      {
        id: '101',
        user: { id: 'userId', name: 'Max Mustermann', email: 'max@test.at', class: '3A', orderCount: 3, balance: 18, blocked: false },
        items: [],
        totalPrice: 7.2,
        createdAt: new Date(),
        status: 'open'
      },
      {
        id: '99',
        user: { id: 'userId', name: 'Max Mustermann', email: 'max@test.at', class: '3A', orderCount: 3, balance: 18, blocked: false },
        items: [],
        totalPrice: 4.5,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'closed'
      }
    ];

    return of(this.addQrForOpenOrders(mock)).pipe(delay(250));
  }
}
