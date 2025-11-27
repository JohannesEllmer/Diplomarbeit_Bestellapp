import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { Order, OrderItem } from '../../../models/menu-item.model';
import { environment } from '../env';

@Injectable({
  providedIn: 'root',
})
export class AdminOrderService {
  // *** Mock-Daten für Entwicklung ***
  private mockOrders: OrderItem[] = [
    {
      menuItem: {
        id: '1',
        name: 'Kürbiscremesuppe',
        description: '',
        price: 4.9,
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
        balance: 10.0,
        blocked: false,
      },
      note: 'Ohne Ingwer',
      quantity: 2,
      delivered: false,
      deliveryTime: '12:30',
    },
    // Additional mock items could be added here as needed
  ];

  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000';
  /** Admin-API im Gateway */
  private readonly adminOrdersEndpoint = `${this.apiBase}/admin/orders`;
  /** User-API (für Erstellen von Orders, falls benötigt) */
  private readonly userOrdersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Alle Bestellungen laden.
   * Gateway: GET /admin/orders → Order[]
   * wird hier zu einer flachen Liste von OrderItems abgebildet.
   */
  getOrders(): Observable<OrderItem[]> {
    if (environment.useMockData) {
      return of(this.mockOrders);
    }

    return this.http.get<Order[]>(this.adminOrdersEndpoint).pipe(
      map((orders) => {
        const list =
          (orders ?? []).flatMap((o) => (o.items ?? []) as OrderItem[]) ?? [];

        // Fallback auf Mock-Daten, falls keine Bestellungen vorhanden sind
        return list.length ? list : this.mockOrders;
      }),
      catchError((error) => {
        console.error(
          'Fehler beim Laden der Bestellungen, Fallback-Daten werden verwendet',
          error,
        );
        return of(this.mockOrders);
      }),
    );
  }

  /**
   * Lieferung für eine Bestellung umschalten.
   * Achtung: im Backend sollte PATCH /admin/orders/:id { delivered } sinnvoll verarbeitet werden.
   */
  toggleDelivered(orderId: string, delivered: boolean): Observable<OrderItem> {
    if (environment.useMockData) {
      const order = this.mockOrders.find((o) => o.menuItem.id === orderId);
      if (order) {
        order.delivered = delivered;
      }
      return of(order!);
    }

    return this.http
      .patch<Order>(`${this.adminOrdersEndpoint}/${orderId}`, { delivered })
      .pipe(
        map((updatedOrder) => {
          const updatedItem = updatedOrder?.items?.[0] as OrderItem | undefined;

          if (updatedItem) {
            return updatedItem;
          }

          const fallback = this.mockOrders.find((o) => o.menuItem.id === orderId);
          if (fallback) {
            fallback.delivered = delivered;
            return fallback;
          }

          return {} as OrderItem;
        }),
        catchError((error) => {
          console.error(
            'Fehler beim Aktualisieren der Lieferung, Fallback-Daten werden verwendet',
            error,
          );
          const fallback = this.mockOrders.find((o) => o.menuItem.id === orderId);
          if (fallback) {
            fallback.delivered = delivered;
            return of(fallback);
          }
          return of({} as OrderItem);
        }),
      );
  }

  /**
   * Bestellung löschen – Küche/Admin.
   * Gateway: DELETE /admin/orders/:id
   */
  deleteOrder(orderId: string): Observable<void> {
    if (environment.useMockData) {
      this.mockOrders = this.mockOrders.filter((o) => o.menuItem.id !== orderId);
      return of(void 0);
    }

    return this.http
      .delete<void>(`${this.adminOrdersEndpoint}/${orderId}`)
      .pipe(
        catchError((error) => {
          console.error(
            'Fehler beim Löschen der Bestellung, Fallback-Daten werden verwendet',
            error,
          );
          this.mockOrders = this.mockOrders.filter((o) => o.menuItem.id !== orderId);
          return of(void 0);
        }),
      );
  }

  /**
   * Bestellung erstellen (nutzt die User-API /orders).
   * Payload wird in ein CreateOrderDto umgewandelt.
   */
  createOrder(orderItem: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      this.mockOrders.push(orderItem);
      return of(orderItem);
    }

    const payload = {
      // CreateOrderDto: items mit menuItemId, quantity, note
      items: [
        {
          menuItemId: orderItem.menuItem.id,
          quantity: orderItem.quantity,
          note: orderItem.note,
        },
      ],
    };

    return this.http.post<Order>(this.userOrdersEndpoint, payload).pipe(
      map((created) => {
        const createdItem = (created?.items?.[0] as OrderItem | undefined) ?? orderItem;
        return createdItem;
      }),
      catchError((error) => {
        console.error(
          'Fehler beim Erstellen der Bestellung, Fallback-Daten werden verwendet',
          error,
        );
        this.mockOrders.push(orderItem);
        return of(orderItem);
      }),
    );
  }

  /**
   * Bestellung aktualisieren – hier weiterhin als „Order mit einem Item" behandelt.
   * Gateway: PATCH /admin/orders/:id
   */
  updateOrder(orderItem: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      const index = this.mockOrders.findIndex((o) => o.menuItem.id === orderItem.menuItem.id);
      if (index !== -1) {
        this.mockOrders[index] = orderItem;
      }
      return of(orderItem);
    }

    const payload = {
      // falls das Backend nur status kennt, wird items ggf. ignoriert
      items: [
        {
          menuItemId: orderItem.menuItem.id,
          quantity: orderItem.quantity,
          note: orderItem.note,
        },
      ],
      status: orderItem.delivered ? 'closed' : 'open',
    };

    // Beachte: Hier wird orderItem.menuItem.id als ID genutzt.
    // Wenn du im Backend eine echte Order-ID verwendest, passe das hier an.
    return this.http
      .patch<Order>(`${this.adminOrdersEndpoint}/${orderItem.menuItem.id}`, payload)
      .pipe(
        map((updated) => ((updated?.items?.[0] as OrderItem | undefined) ?? orderItem)),
        catchError((error) => {
          console.error(
            'Fehler beim Aktualisieren der Bestellung, Fallback-Daten werden verwendet',
            error,
          );
          const index = this.mockOrders.findIndex((o) => o.menuItem.id === orderItem.menuItem.id);
          if (index !== -1) {
            this.mockOrders[index] = orderItem;
          }
          return of(orderItem);
        }),
      );
  }

  /**
   * Bestellung per QR-Code abschließen → Status closed.
   * Gateway: PATCH /admin/orders/:id { status: 'closed' }
   */
  completeOrder(orderId: string, qrCode: string): Observable<void> {
    if (environment.useMockData) {
      this.mockOrders = this.mockOrders.filter((o) => o.menuItem.id !== orderId);
      console.log(`Mock: Bestellung ${orderId} abgeschlossen mit QR-Code: ${qrCode}`);
      return of(void 0);
    }

    const payload = { status: 'closed' as const };

    return this.http
      .patch<Order>(`${this.adminOrdersEndpoint}/${orderId}`, payload)
      .pipe(
        map(() => void 0),
        catchError((error) => {
          console.error(
            'Fehler beim Abschließen der Bestellung, Fallback-Daten werden verwendet',
            error,
          );
          this.mockOrders = this.mockOrders.filter((o) => o.menuItem.id !== orderId);
          return of(void 0);
        }),
      );
  }
}
