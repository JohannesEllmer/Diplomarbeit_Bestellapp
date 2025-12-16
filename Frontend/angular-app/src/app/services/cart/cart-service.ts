import { Injectable } from '@angular/core';
import { OrderItem } from '../../../models/menu-item.model';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'cartItems';

  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  constructor(private http: HttpClient) {}

  getCartItems(): OrderItem[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  saveCartItems(items: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  clearCart(): void {
    localStorage.removeItem(this.storageKey);
  }

  increaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    items[index].quantity += 1;
    this.saveCartItems(items);
    return items;
  }

  decreaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    if (items[index].quantity > 1) {
      items[index].quantity -= 1;
      this.saveCartItems(items);
    }
    return items;
  }

  updateNote(items: OrderItem[], index: number, note: string): OrderItem[] {
    items[index].note = note;
    this.saveCartItems(items);
    return items;
  }

  removeItem(items: OrderItem[], index: number): OrderItem[] {
    items.splice(index, 1);
    this.saveCartItems(items);
    return items;
  }

  getTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  getItemCount(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  //Validiert Uhrzeitformat mit Regex
  isValidTimeFormat(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time) && !isNaN(Date.parse(`1970-01-01T${time}:00`));
  }

  buildOrderFromCart(items?: OrderItem[]) {
    const cart = items ?? this.getCartItems();

    return {
      items: cart.map(i => ({
        menuItemId: i.menuItem.id,
        quantity: i.quantity,
        note: i.note ?? ''
      })),
      totalPrice: this.getTotal(cart),
      createdAt: new Date().toISOString(),
      status: 'open' as const
    };
  }

  submitOrder(order?: any): Observable<any> {
    if (environment.useMockData) {
      console.log('Testmodus aktiv – Bestellung simuliert:', order);
      return of({ success: true, message: 'Bestellung simuliert (Mock-Daten)', fallback: true });
    }

    const payload = order ?? this.buildOrderFromCart();

    return this.http.post<any>(this.ordersEndpoint, payload).pipe(
      map(response => {
        if (response == null) {
          return {
            success: true,
            message: 'Bestellung wurde gesendet, aber Server lieferte keine Daten – Fallback-Antwort.',
            fallback: true
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('Fehler beim Senden der Bestellung, Fallback wird verwendet', error);
        return of({
          success: false,
          message: 'Bestellung konnte nicht an das Backend gesendet werden.',
          fallback: true,
          error
        });
      })
    );
  }
}
