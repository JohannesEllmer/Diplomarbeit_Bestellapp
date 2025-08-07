import { Injectable } from '@angular/core';
import { OrderItem } from '../../../models/menu-item.model';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../env';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly storageKey = 'cartItems';
  private readonly apiUrl = 'https://your-backend-api.com/orders'; // Backend-URL anpassen

  constructor(private http: HttpClient) {}

  /** Lädt gespeicherte Warenkorbpositionen aus dem LocalStorage */
  getCartItems(): OrderItem[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  /** Speichert Warenkorbpositionen lokal */
  saveCartItems(items: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  /** Löscht den Warenkorb */
  clearCart(): void {
    localStorage.removeItem(this.storageKey);
  }

  /** Erhöht die Menge eines Artikels */
  increaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    items[index].quantity += 1;
    this.saveCartItems(items);
    return items;
  }

  /** Verringert die Menge eines Artikels */
  decreaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    if (items[index].quantity > 1) {
      items[index].quantity -= 1;
      this.saveCartItems(items);
    }
    return items;
  }

  /** Aktualisiert die Notiz eines Artikels */
  updateNote(items: OrderItem[], index: number, note: string): OrderItem[] {
    items[index].note = note;
    this.saveCartItems(items);
    return items;
  }

  /** Entfernt einen Artikel aus dem Warenkorb */
  removeItem(items: OrderItem[], index: number): OrderItem[] {
    items.splice(index, 1);
    this.saveCartItems(items);
    return items;
  }

  /** Berechnet den Gesamtbetrag */
  getTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  /** Zählt alle Artikel im Warenkorb */
  getItemCount(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /** Validiert Uhrzeitformat HH:mm */
  isValidTimeFormat(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time) && !isNaN(Date.parse(`1970-01-01T${time}:00`));
  }

  /** Sendet Bestellung ans Backend oder simuliert sie im Testmodus */
  submitOrder(order: any): Observable<any> {
    if (environment.useMockData) {
      console.log('Testmodus aktiv – Bestellung simuliert:', order);
      return of({ success: true, message: 'Bestellung simuliert' });
    }
    return this.http.post(this.apiUrl, order);
  }
}
