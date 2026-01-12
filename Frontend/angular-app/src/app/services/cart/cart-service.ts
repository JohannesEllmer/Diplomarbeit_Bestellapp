import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../env';
import { Observable } from 'rxjs';
import { OrderItem } from '../../../models/menu-item.model';

type CreateOrderPayload = {
  items: Array<{
    menuItemId: string;
    quantity: number;
    note?: string;
    deliveryTime?: string;
  }>;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly ordersEndpoint = `${this.apiBase}/orders`;

  private storageKey = 'cart';

  constructor(private http: HttpClient) {}

  // --- persistence ---
  getCartItems(): OrderItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as OrderItem[]) : [];
    } catch {
      return [];
    }
  }

  private saveCart(items: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  // ✅ Kompatibilität: wird von MenuPlan + Specs erwartet
  saveCartItems(items: OrderItem[]): void {
    this.saveCart(items ?? []);
  }

  clearCart(): void {
    localStorage.removeItem(this.storageKey);
  }

  // --- item ops ---
  increaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    const next = [...(items ?? [])];
    next[index] = { ...next[index], quantity: (next[index].quantity ?? 0) + 1 };
    this.saveCart(next);
    return next;
  }

  decreaseQuantity(items: OrderItem[], index: number): OrderItem[] {
    const next = [...(items ?? [])];
    const q = (next[index].quantity ?? 0) - 1;
    next[index] = { ...next[index], quantity: Math.max(1, q) };
    this.saveCart(next);
    return next;
  }

  updateNote(items: OrderItem[], index: number, note: string): OrderItem[] {
    const next = [...(items ?? [])];
    next[index] = { ...next[index], note };
    this.saveCart(next);
    return next;
  }

  removeItem(items: OrderItem[], index: number): OrderItem[] {
    const next = (items ?? []).filter((_, i) => i !== index);
    this.saveCart(next);
    return next;
  }

  // ✅ Kompatibilität: wird von MenuPlan + Specs erwartet
  getItemCount(items: OrderItem[]): number {
    return (items ?? []).reduce((sum, it) => sum + Number(it.quantity ?? 0), 0);
  }

  getTotal(items: OrderItem[]): number {
    return (items ?? []).reduce((sum, it) => sum + (it.menuItem.price * it.quantity), 0);
  }

  isValidTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test((time || '').trim());
  }

  // Backend submit
  submitOrder(payload: CreateOrderPayload): Observable<any> {
    return this.http.post(this.ordersEndpoint, payload);
  }
}
