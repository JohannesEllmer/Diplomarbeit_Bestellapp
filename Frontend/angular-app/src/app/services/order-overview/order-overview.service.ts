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
        
        user: o.user,
      })).filter(o => o.user?.id === this.auth.getCurrentUserId()))
    );
  }

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
  /** Mock-Daten für lokale Entwicklung / Storybook */
private getMyOrdersMock(): Observable<Order[]> {
  const currentUserId = this.auth.getCurrentUserId();

  const user = {
    id: currentUserId,
    name: 'Max Mustermann',
    email: 'max@test.at',
    class: '3A',
    orderCount: 5,
    balance: 18,
    blocked: false
  };

  // Beispiel-Menüeinträge
  const pizzaMargherita = {
    id: 'm1',
    name: 'Pizza Margherita',
    description: 'Klassische Pizza mit Tomaten und Mozzarella',
    price: 4.50,
    category: 'Hauptspeise',
    available: true,
    vegetarian: true,
    allergens: ['A', 'G']
  };

  const cola = {
    id: 'm2',
    name: 'Cola 0,5l',
    description: 'Gekühltes Erfrischungsgetränk',
    price: 1.80,
    category: 'Getränk',
    available: true,
    vegetarian: true,
    allergens: []
  };

  const pastaBolognese = {
    id: 'm3',
    name: 'Pasta Bolognese',
    description: 'Pasta mit Rindfleischsauce',
    price: 5.20,
    category: 'Hauptspeise',
    available: true,
    vegetarian: false,
    allergens: ['A', 'C']
  };

  const brownie = {
    id: 'm4',
    name: 'Schoko-Brownie',
    description: 'Saftiger Brownie mit Schokostückchen',
    price: 2.00,
    category: 'Dessert',
    available: true,
    vegetarian: true,
    allergens: ['A', 'C', 'G']
  };

  const openItems = [
    {
      menuItem: pizzaMargherita,
      user,
      quantity: 2,
      note: 'Bitte gut durchbacken',
      delivered: false
    },
    {
      menuItem: cola,
      user,
      quantity: 1,
      note: '',
      delivered: false
    },
    {
      menuItem: brownie,
      user,
      quantity: 1,
      note: 'Ohne Puderzucker oben drauf, bitte',
      delivered: false
    }
  ];

  const closedItems = [
    {
      menuItem: pastaBolognese,
      user,
      quantity: 1,
      note: '',
      delivered: true
    }
  ];

  const calcTotal = (items: any[]) =>
    items.reduce((sum, it) => sum + it.menuItem.price * it.quantity, 0);

  const mock: Order[] = [
    {
      id: '101',
      user,
      items: openItems,
      totalPrice: calcTotal(openItems),
      createdAt: new Date(),
      status: 'open',
      showDetails: true // optional: für Test gleich aufgeklappt
    },
    {
      id: '99',
      user,
      items: closedItems,
      totalPrice: calcTotal(closedItems),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'closed',
      showDetails: false
    }
  ];

  return of(this.addQrForOpenOrders(mock)).pipe(delay(250));
}

}
