import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { Order, OrderItem } from '../../../models/menu-item.model';
import { environment } from '../env';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private mockOrders: OrderItem[] = [
    {
      menuItem: {
        id: '1',
        name: 'Kürbiscremesuppe',
        description: '',
        price: 4.90,
        category: 'Vorspeisen',
        available: true,
        vegetarian: true,
        allergens: [],
      },
      user: {
        id: '101',
        name: 'Anna Müller',
        email: 'anna@example.com',
        class: '3A',
        orderCount: 5,
        balance: 10.00,
        blocked: false,
      },
      note: 'Ohne Ingwer',
      quantity: 2,
      delivered: false,
      deliveryTime: '12:30'
    },  
  ];

  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<OrderItem[]> {
    if (environment.useMockData) {
      return of(this.mockOrders);
    }

    return this.http.get<Order[]>(this.ordersEndpoint).pipe(
      map(orders => {
        const list = (orders ?? [])
          .flatMap(o => (o.items ?? []) as OrderItem[]);

        return list.length ? list : this.mockOrders;
      }),
      catchError(error => {
        console.error('Fehler beim Laden der Bestellungen, Fallback-Daten werden verwendet', error);
        return of(this.mockOrders);
      })
    );
  }

  toggleDelivered(orderId: string, delivered: boolean): Observable<OrderItem> {
    if (environment.useMockData) {
      const order = this.mockOrders.find(o => o.menuItem.id === orderId);
      if (order) order.delivered = delivered;
      return of(order!);
    }


    return this.http.patch<Order>(`${this.ordersEndpoint}/${orderId}`, { delivered }).pipe(
      map(updatedOrder => {
        // Versuche, ein Item aus der Antwort zu nehmen – ansonsten Mock updaten.
        const updatedItem = (updatedOrder?.items?.[0] as OrderItem | undefined);
        if (updatedItem) {
          return updatedItem;
        }

        const fallback = this.mockOrders.find(o => o.menuItem.id === orderId);
        if (fallback) {
          fallback.delivered = delivered;
          return fallback;
        }

        return { ...{} } as OrderItem;
      }),
      catchError(error => {
        console.error('Fehler beim Aktualisieren der Lieferung, Fallback-Daten werden verwendet', error);
        const fallback = this.mockOrders.find(o => o.menuItem.id === orderId);
        if (fallback) {
          fallback.delivered = delivered;
          return of(fallback);
        }
        return of({} as OrderItem);
      })
    );
  }

  deleteOrder(orderId: string): Observable<void> {
    if (environment.useMockData) {
      this.mockOrders = this.mockOrders.filter(o => o.menuItem.id !== orderId);
      return of();
    }

    return this.http.delete<void>(`${this.ordersEndpoint}/${orderId}`).pipe(
      catchError(error => {
        console.error('Fehler beim Löschen der Bestellung, Fallback-Daten werden verwendet', error);
        this.mockOrders = this.mockOrders.filter(o => o.menuItem.id !== orderId);
        return of(void 0);
      })
    );
  }

  createOrder(orderItem: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      this.mockOrders.push(orderItem);
      return of(orderItem);
    }

    const payload: Partial<Order> = {
      user: orderItem.user,
      items: [orderItem],
      totalPrice: orderItem.menuItem.price * orderItem.quantity,
      createdAt: new Date(),
      status: orderItem.delivered ? 'closed' : 'open'
    };

    return this.http.post<Order>(this.ordersEndpoint, payload).pipe(
      map(created => {
        const createdItem = (created?.items?.[0] as OrderItem | undefined) ?? orderItem;
        return createdItem;
      }),
      catchError(error => {
        console.error('Fehler beim Erstellen der Bestellung, Fallback-Daten werden verwendet', error);
        this.mockOrders.push(orderItem);
        return of(orderItem);
      })
    );
  }

  updateOrder(orderItem: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      const index = this.mockOrders.findIndex(o => o.menuItem.id === orderItem.menuItem.id);
      if (index !== -1) this.mockOrders[index] = orderItem;
      return of(orderItem);
    }

    const payload: Partial<Order> = {
      user: orderItem.user,
      items: [orderItem],
      totalPrice: orderItem.menuItem.price * orderItem.quantity,
      status: orderItem.delivered ? 'closed' : 'open'
    };

    return this.http.patch<Order>(`${this.ordersEndpoint}/${orderItem.menuItem.id}`, payload).pipe(
      map(updated => (updated?.items?.[0] as OrderItem | undefined) ?? orderItem),
      catchError(error => {
        console.error('Fehler beim Aktualisieren der Bestellung, Fallback-Daten werden verwendet', error);
        const index = this.mockOrders.findIndex(o => o.menuItem.id === orderItem.menuItem.id);
        if (index !== -1) this.mockOrders[index] = orderItem;
        return of(orderItem);
      })
    );
  }

  completeOrder(orderId: string, qrCode: string): Observable<void> {
    if (environment.useMockData) {
      this.mockOrders = this.mockOrders.filter(o => o.menuItem.id !== orderId);
      console.log(`Mock: Bestellung ${orderId} abgeschlossen mit QR-Code: ${qrCode}`);
      return of();
    }

    const payload: Partial<Order> = { status: 'closed' };

    return this.http.patch<Order>(`${this.ordersEndpoint}/${orderId}`, payload).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Fehler beim Abschließen der Bestellung, Fallback-Daten werden verwendet', error);
        this.mockOrders = this.mockOrders.filter(o => o.menuItem.id !== orderId);
        return of(void 0);
      })
    );
  }
}
