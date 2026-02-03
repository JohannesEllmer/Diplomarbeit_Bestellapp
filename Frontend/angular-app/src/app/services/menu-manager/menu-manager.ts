import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../env';
import { MealPlan } from '../../../models/meal-plan.model';
import { MenuItem } from '../../../models/menu-item.model';

@Injectable({ providedIn: 'root' })
export class MenuManagerService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly mealPlansEndpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  private mapMenuItem(x: any): MenuItem {
    return {
      id: String(x.id),
      name: x.name ?? '',
      description: x.description ?? '',
      price: Number(x.price ?? 0),
      category: x.category ?? '',
      vegetarian: !!x.vegetarian,
      available: x.available !== false,
      allergens: Array.isArray(x.allergens) ? x.allergens : [],
      drink: x.drink ?? undefined,
      dessert: x.dessert ?? undefined,
    };
  }

  private mapMealPlan(m: any): MealPlan {
    const raw =
      Array.isArray(m.menuItems) ? m.menuItems :
      Array.isArray(m.menu_items) ? m.menu_items :
      Array.isArray(m.dishes) ? m.dishes :
      [];

    return {
      id: String(m.id),
      title: m.title ?? '',
      isSelected: !!m.isSelected || !!m.is_selected,
      menuItems: raw.map((x: any) => this.mapMenuItem(x)),
    };
  }

  getMenus(): Observable<MealPlan[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<any[]>(this.mealPlansEndpoint).pipe(
      map(rows => (rows ?? []).map(r => this.mapMealPlan(r))),
      catchError(err => {
        console.error('MenuManagerService.getMenus failed:', err);
        return of([]);
      }),
    );
  }

  deleteMenu(id: string): Observable<void> {
    if (environment.useMockData) return of(void 0);
    const raw = String(id ?? '').trim();
    if (!raw) return of(void 0);

    return this.http.delete<void>(`${this.mealPlansEndpoint}/${encodeURIComponent(raw)}`).pipe(
      catchError(err => {
        console.error('MenuManagerService.deleteMenu failed:', err);
        return of(void 0);
      }),
    );
  }

  getSelectedMealPlan(): Observable<MealPlan | null> {
    if (environment.useMockData) return of(null);

    // ✅ nur /selected (kein /active mehr!)
    return this.http.get<any>(`${this.mealPlansEndpoint}/selected`).pipe(
      map(plan => (plan ? this.mapMealPlan(plan) : null)),
      catchError(err => {
        console.error('MenuManagerService.getSelectedMealPlan failed:', err);
        return of(null);
      }),
    );
  }

  setSelected(menuId: string): Observable<{ ok: boolean; id?: string }> {
    if (environment.useMockData) return of({ ok: true, id: menuId });

    const id = String(menuId ?? '').trim();
    if (!id) return of({ ok: false });

    // ✅ bevorzugt: /:id/select (das passt zu deinem Controller)
    const byParam$ = this.http.patch<{ ok: boolean; id?: string }>(
      `${this.mealPlansEndpoint}/${encodeURIComponent(id)}/select`,
      {},
    );

    // ✅ fallback: /select (body)
    const byBody$ = this.http.patch<{ ok: boolean; id?: string }>(
      `${this.mealPlansEndpoint}/select`,
      { id },
    );

    return byParam$.pipe(
      catchError(err1 =>
        byBody$.pipe(
          catchError(err2 => {
            console.error('MenuManagerService.setSelected failed:', err1, err2);
            return of({ ok: false });
          }),
        ),
      ),
    );
  }

  getMealPlanById(id: string): Observable<MealPlan | null> {
    const raw = String(id ?? '').trim();
    if (!raw) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<any>(`${this.mealPlansEndpoint}/${encodeURIComponent(raw)}`).pipe(
      map(plan => (plan ? this.mapMealPlan(plan) : null)),
      catchError(err => {
        console.error('MenuManagerService.getMealPlanById failed:', err);
        return of(null);
      }),
    );
  }
}
