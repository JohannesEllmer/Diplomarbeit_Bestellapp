import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, delay, catchError } from 'rxjs';
import { environment } from '../env';
import { Order } from '../../../models/menu-item.model';
import { AuthService } from '../../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class MyOrderService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  getMyOrders(): Observable<Order[]> {
    if (environment.useMockData) return this.getMyOrdersMock();

    return this.http.get<Order[]>(`${this.ordersEndpoint}/my`).pipe(
      map((orders) => this.addQrForOpenOrders(orders ?? [])),
      catchError((error) => {
        console.error('getMyOrders failed:', error);
        return this.getMyOrdersMock();
      })
    );
  }

  public addQrForOpenOrders(orders: Order[]): Order[] {
    return orders.map((o) => ({
      ...o,
      qrCodeUrl: o.status === 'open' ? this.generateQrCode(o.id) : undefined,
    }));
  }

  private generateQrCode(orderId: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-${orderId}`;
  }

  private getMyOrdersMock(): Observable<Order[]> {
    const currentUserId = this.auth.getCurrentUser()?.id ?? 'mock-user';

    const user = {
      id: currentUserId,
      name: 'Max Mustermann',
      email: 'max@test.at',
      class: '3A',
      orderCount: 5,
      balance: 18,
      blocked: false,
    };

    const pizza = {
      id: 'm1',
      name: 'Pizza Margherita',
      description: 'Klassische Pizza',
      price: 4.5,
      category: 'Hauptspeise',
      available: true,
      vegetarian: true,
      allergens: ['A', 'G'],
    };

    const openItems = [
      { menuItem: pizza, user, quantity: 2, note: 'Bitte gut durchbacken', delivered: false },
    ];

    const calcTotal = (items: any[]) => items.reduce((sum, it) => sum + it.menuItem.price * it.quantity, 0);

    const mock: Order[] = [
      {
        id: '101',
        user,
        items: openItems as any,
        totalPrice: calcTotal(openItems),
        createdAt: new Date() as any,
        status: 'open',
      } as any,
    ];

    return of(this.addQrForOpenOrders(mock)).pipe(delay(250));
  }
}
