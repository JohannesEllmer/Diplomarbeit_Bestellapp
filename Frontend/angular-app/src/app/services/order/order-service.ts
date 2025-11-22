import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { Order, OrderItem } from '../../../models/menu-item.model';
import { environment } from '../../env';

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
    {
      menuItem: {
        id: '2',
        name: 'Wiener Schnitzel',
        description: '',
        price: 12.50,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: false,
        allergens: [],
      },
      user: {
        id: '102',
        name: 'Max Mustermann',
        email: 'max@example.com',
        class: '4B',
        orderCount: 3,
        balance: 5.00,
        blocked: false,
      },
      note: '',
      quantity: 1,
      delivered: true,
      deliveryTime: '13:00'
    },
    {
      menuItem: {
        id: '3',
        name: 'Spaghetti Bolognese',
        description: '',
        price: 8.90,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: false,
        allergens: ['Gluten'],
      },
      user: {
        id: '103',
        name: 'Lisa Schmidt',
        email: 'lisa@example.com',
        class: '5C',
        orderCount: 7,
        balance: 8.50,
        blocked: false,
      },
      note: 'Extra Käse',
      quantity: 1,
      delivered: false,
      deliveryTime: '12:45'
    },
    {
      menuItem: {
        id: '4',
        name: 'Gemüsepfanne',
        description: '',
        price: 7.50,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: true,
        allergens: [],
      },
      user: {
        id: '104',
        name: 'Tom Becker',
        email: 'tom@example.com',
        class: '2C',
        orderCount: 2,
        balance: 12.00,
        blocked: false,
      },
      note: '',
      quantity: 1,
      delivered: false,
      deliveryTime: '12:15'
    },
    {
      menuItem: {
        id: '5',
        name: 'Apfelstrudel',
        description: '',
        price: 3.90,
        category: 'Desserts',
        available: true,
        vegetarian: true,
        allergens: ['Gluten'],
      },
      user: {
        id: '105',
        name: 'Julia König',
        email: 'julia@example.com',
        class: '1A',
        orderCount: 1,
        balance: 6.00,
        blocked: false,
      },
      note: '',
      quantity: 2,
      delivered: true,
      deliveryTime: '13:15'
    },
    {
      menuItem: {
        id: '6',
        name: 'Grüner Salat',
        description: '',
        price: 4.50,
        category: 'Vorspeisen',
        available: true,
        vegetarian: true,
        allergens: [],
      },
      user: {
        id: '106',
        name: 'Felix Bauer',
        email: 'felix@example.com',
        class: '3B',
        orderCount: 4,
        balance: 9.00,
        blocked: false,
      },
      note: 'Ohne Dressing',
      quantity: 1,
      delivered: false,
      deliveryTime: '12:00'
    },
    {
      menuItem: {
        id: '7',
        name: 'Pizza Margherita',
        description: '',
        price: 9.90,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: true,
        allergens: ['Gluten', 'Milch'],
      },
      user: {
        id: '107',
        name: 'Nina Schwarz',
        email: 'nina@example.com',
        class: '4A',
        orderCount: 6,
        balance: 11.00,
        blocked: false,
      },
      note: '',
      quantity: 1,
      delivered: false,
      deliveryTime: '12:30'
    },
    {
      menuItem: {
        id: '8',
        name: 'Mineralwasser',
        description: '',
        price: 1.50,
        category: 'Getränke',
        available: true,
        vegetarian: true,
        allergens: [],
      },
      user: {
        id: '108',
        name: 'Paul Weber',
        email: 'paul@example.com',
        class: '2B',
        orderCount: 2,
        balance: 3.00,
        blocked: false,
      },
      note: '',
      quantity: 1,
      delivered: true,
      deliveryTime: '13:00'
    },
    {
      menuItem: {
        id: '9',
        name: 'Tomatensuppe',
        description: '',
        price: 4.20,
        category: 'Vorspeisen',
        available: true,
        vegetarian: true,
        allergens: [],
      },
      user: {
        id: '109',
        name: 'Sophie Lang',
        email: 'sophie@example.com',
        class: '5A',
        orderCount: 8,
        balance: 7.50,
        blocked: false,
      },
      note: 'Mit Croutons',
      quantity: 1,
      delivered: false,
      deliveryTime: '12:45'
    },
    {
      menuItem: {
        id: '10',
        name: 'Schokoladenpudding',
        description: '',
        price: 2.90,
        category: 'Desserts',
        available: true,
        vegetarian: true,
        allergens: ['Milch'],
      },
      user: {
        id: '110',
        name: 'Leon Hoffmann',
        email: 'leon@example.com',
        class: '1B',
        orderCount: 1,
        balance: 5.00,
        blocked: false,
      },
      note: '',
      quantity: 1,
      delivered: true,
      deliveryTime: '13:30'
    }
  ];

  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  /** Alle Bestellungen abrufen (GET /orders) und in OrderItems abbilden */
  getOrders(): Observable<OrderItem[]> {
    if (environment.useMockData) {
      return of(this.mockOrders);
    }

    return this.http.get<Order[]>(this.ordersEndpoint).pipe(
      map(orders => {
        const list = (orders ?? [])
          .flatMap(o => (o.items ?? []) as OrderItem[]);

        // Fallback auf Mock-Daten, falls keine Bestellungen vorhanden sind
        return list.length ? list : this.mockOrders;
      }),
      catchError(error => {
        console.error('Fehler beim Laden der Bestellungen, Fallback-Daten werden verwendet', error);
        return of(this.mockOrders);
      })
    );
  }

  /** Lieferung umschalten */
  toggleDelivered(orderId: string, delivered: boolean): Observable<OrderItem> {
    if (environment.useMockData) {
      const order = this.mockOrders.find(o => o.menuItem.id === orderId);
      if (order) order.delivered = delivered;
      return of(order!);
    }

    // Wir patchen die Order (NestJS: PATCH /orders/:id).
    // Hier senden wir ein einfaches Flag; das Backend kann dieses ggf. ignorieren
    // oder für zukünftige Erweiterungen nutzen.
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

        // letzter Fallback: leeres Objekt in den erwarteten Typ casten
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

  /** Bestellung löschen */
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

  /** Bestellung erstellen (wrappt ein OrderItem in eine Order mit einem Item) */
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

  /** Bestellung aktualisieren (OrderItem → Order mit einem Item, PATCH /orders/:id) */
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

    // Hier wird als ID weiterhin menuItem.id genutzt – wenn du im Backend
    // eine echte Order-ID hast, kannst du das hier leicht anpassen.
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

  /** Bestellung per QR-Code abschließen: setzt Status auf closed (PATCH /orders/:id) */
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
