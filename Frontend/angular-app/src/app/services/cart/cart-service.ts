import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../env';
import { MenuService } from '../../services/menu/menu-service';
import { AuthService } from '../AuthService';

type CreateOrderItemDto = {
  menuItemId: string;
  quantity: number;
  note?: string;
  deliveryTime?: string; // ISO
};

type CreateOrderDto = {
  items: CreateOrderItemDto[];
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';

  private readonly STORAGE_KEY = 'cart_items';
  private readonly STORAGE_MENU_KEY = 'cart_active_menu_id';

  constructor(
    private http: HttpClient,
    private menuService: MenuService,
    private auth: AuthService,
  ) {}

  // -------------------------
  // Auth helper
  // -------------------------
  private isAuthenticated(): boolean {
    try {
      const token = (this.auth as any)?.getToken?.();
      if (token) return true;
    } catch {}

    try {
      const user = (this.auth as any)?.getCurrentUser?.();
      return !!user;
    } catch {
      return false;
    }
  }

  // -------------------------
  // Storage
  // -------------------------
  getCartItems(): any[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveCartItems(items: any[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items ?? []));
  }

  clearCart(): void {
    this.saveCartItems([]);
    this.clearCartMenuId();
  }

  // -------------------------
  // Menü-Marker (für Menüwechsel-Erkennung)
  // -------------------------
  setCartMenuId(menuId: string): void {
    const v = String(menuId ?? '').trim();
    if (!v) return;
    localStorage.setItem(this.STORAGE_MENU_KEY, v);
  }

  getCartMenuId(): string {
    return String(localStorage.getItem(this.STORAGE_MENU_KEY) ?? '').trim();
  }

  clearCartMenuId(): void {
    localStorage.removeItem(this.STORAGE_MENU_KEY);
  }

  // -------------------------
  // UI Helpers
  // -------------------------
  getItemCount(items: any[]): number {
    return (items ?? []).reduce((sum, it) => sum + Number(it?.quantity ?? 0), 0);
  }

  getTotal(items: any[]): number {
    return (items ?? []).reduce((sum, it) => {
      const price = Number(it?.menuItem?.price ?? 0);
      const qty = Number(it?.quantity ?? 0);
      return sum + price * qty;
    }, 0);
  }

  // -------------------------
  // Cart mutations
  // -------------------------
  increaseQuantity(items: any[], index: number): any[] {
    const arr = [...(items ?? [])];
    if (!arr[index]) return arr;

    arr[index].quantity = Number(arr[index].quantity ?? 0) + 1;
    this.saveCartItems(arr);
    return arr;
  }

  decreaseQuantity(items: any[], index: number): any[] {
    const arr = [...(items ?? [])];
    if (!arr[index]) return arr;

    const q = Number(arr[index].quantity ?? 0) - 1;
    if (q <= 0) arr.splice(index, 1);
    else arr[index].quantity = q;

    this.saveCartItems(arr);
    return arr;
  }

  updateNote(items: any[], index: number, note: string): any[] {
    const arr = [...(items ?? [])];
    if (!arr[index]) return arr;

    arr[index].note = String(note ?? '');
    this.saveCartItems(arr);
    return arr;
  }

  removeItem(items: any[], index: number): any[] {
    const arr = [...(items ?? [])];
    if (index < 0 || index >= arr.length) return arr;

    arr.splice(index, 1);
    this.saveCartItems(arr);
    return arr;
  }

  // -------------------------
  // Time validation
  // -------------------------
  isValidTimeFormat(hhmm: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(hhmm ?? '').trim());
  }

  // -------------------------
  // Cart validieren gegen aktives Menü
  // - Wenn Menü gewechselt -> Cart leeren
  // - Wenn Gericht nicht mehr im Menü oder available=false -> entfernen
  // -------------------------
  validateCartAgainstActiveMenu(): Observable<{
    clearedBecauseMenuChanged: boolean;
    removedItemsCount: number;
  }> {
    if (!this.isAuthenticated()) {
      return of({ clearedBecauseMenuChanged: false, removedItemsCount: 0 });
    }

    const before = this.getCartItems();

    return this.menuService.getSelectedMealPlan().pipe(
      map((plan: any) => {
        // Kein aktives Menü -> Cart leeren
        if (!plan) {
          const removed = before.length;
          if (removed) this.clearCart();
          return { clearedBecauseMenuChanged: true, removedItemsCount: removed };
        }

        const activeMenuId = String(plan?.id ?? '').trim();
        const storedMenuId = this.getCartMenuId();

        // Menüwechsel -> kompletten Cart leeren (wenn wir schon mal ein Menü gespeichert hatten)
        if (storedMenuId && activeMenuId && storedMenuId !== activeMenuId) {
          const removed = before.length;
          this.clearCart();            // löscht auch MenuId
          this.setCartMenuId(activeMenuId);
          return { clearedBecauseMenuChanged: true, removedItemsCount: removed };
        }

        // Falls noch kein storedMenuId vorhanden -> merken
        if (!storedMenuId && activeMenuId) {
          this.setCartMenuId(activeMenuId);
        }

        // Items des aktiven Menüs + availability
        const raw = (plan as any)?.menuItems ?? [];
        const menuItems = Array.isArray(raw) ? raw : [];

        const allowed = new Map<string, boolean>();
        for (const mi of menuItems) {
          const id = String(mi?.id ?? '').trim();
          if (!id) continue;
          allowed.set(id, mi?.available !== false);
        }

        const filtered = (before ?? []).filter(ci => {
          const id = String(ci?.menuItem?.id ?? '').trim();
          if (!id) return false;
          if (!allowed.has(id)) return false;           // nicht mehr im Menü
          if (allowed.get(id) === false) return false;  // nicht verfügbar
          return true;
        });

        const removedItemsCount = before.length - filtered.length;
        if (removedItemsCount > 0) this.saveCartItems(filtered);

        return { clearedBecauseMenuChanged: false, removedItemsCount };
      }),
      catchError(() => of({ clearedBecauseMenuChanged: false, removedItemsCount: 0 })),
    );
  }

  // -------------------------
  // Submit order
  // -------------------------
  submitOrder(dto: CreateOrderDto): Observable<any> {
    if (environment.useMockData) return of({ ok: true });

    return this.http.post(`${this.apiBase}/orders`, dto).pipe(
      catchError(err => throwError(() => err)),
    );
  }
}
