import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Menu } from '../../../models/menu.model';
import { MenuItem, OrderItem } from '../../../models/menu-item.model';
import { MealPlan } from '../../../models/meal-plan.model';
import { environment } from '../../env';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly apiBase =
    environment.apiBaseUrl ?? 'http://localhost:3000/api';

  private readonly menuItemsEndpoint = `${this.apiBase}/menu-items`;
  private readonly menusEndpoint = `${this.apiBase}/menus`;

  private readonly storageKey = 'cartItems';

  constructor(private http: HttpClient) {}

  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<MenuItem[]>(this.menuItemsEndpoint).pipe(
      catchError(() => of([]))
    );
  }

//Menu
  getMenus(): Observable<Menu[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<Menu[]>(this.menusEndpoint).pipe(
      catchError(() => of([]))
    );
  }

  saveMenu(menu: MealPlan): Observable<MealPlan> {
    if (environment.useMockData) {
      return of({ ...menu, id: crypto.randomUUID() });
    }

    if (menu.id === 'new') {
      return this.http.post<MealPlan>(this.menusEndpoint, menu);
    }

    return this.http.put<MealPlan>(`${this.menusEndpoint}/${menu.id}`, menu);
  }

 

  saveOrderItems(orderItems: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(orderItems));
  }

  getOrderItems(): OrderItem[] {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : [];
  }

  clearOrderItems(): void {
    localStorage.removeItem(this.storageKey);
  }
}
