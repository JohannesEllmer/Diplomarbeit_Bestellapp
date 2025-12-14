import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Menu } from '../../../models/menu.model';
import { MenuItem, OrderItem } from '../../../models/menu-item.model';
import { environment } from '../../env';

@Injectable({ providedIn: 'root' })
export class MenuService {
  // ✅ BaseURL aus environment (inkl. /api)
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';

  // ✅ echte Gateway-Endpunkte
  private readonly menuItemsEndpoint = `${this.apiBase}/menu-items`; // falls bei dir anders: hier ändern
  private readonly menusEndpoint = `${this.apiBase}/menus`;

  // Lokaler Storage (wie bisher)
  private readonly storageKey = 'cartItems';

  // -----------------------
  // Mock-Daten (wie gehabt)
  // -----------------------
  private readonly mockMenuItems: MenuItem[] = [/* ...deine mocks wie vorher... */];
  private readonly mockMenus: Menu[] = [/* ...deine mocks wie vorher... */];

  constructor(private http: HttpClient) {}

  // -------------------------------------------------
  // Einzelgerichte (Items)
  // -------------------------------------------------
  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockData) {
      return of(this.mockMenuItems);
    }
    return this.http.get<MenuItem[]>(this.menuItemsEndpoint).pipe(
      catchError(err => {
        console.error('getMenuItems failed, fallback mock:', err);
        return of(this.mockMenuItems);
      })
    );
  }

  // -------------------------------------------------
  // Vorgefertigte Menüs (Combos)
  // -------------------------------------------------
  getMenus(): Observable<Menu[]> {
    if (environment.useMockData) {
      return of(this.mockMenus);
    }
    return this.http.get<Menu[]>(this.menusEndpoint).pipe(
      catchError(err => {
        console.error('getMenus failed, fallback mock:', err);
        return of(this.mockMenus);
      })
    );
  }

  // -------------------------------------------------
  // Lokaler Warenkorb (beibehalten)
  // -------------------------------------------------
  saveOrderItems(orderItems: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(orderItems));
  }

  getOrderItems(): OrderItem[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  clearOrderItems(): void {
    localStorage.removeItem(this.storageKey);
  }
}
