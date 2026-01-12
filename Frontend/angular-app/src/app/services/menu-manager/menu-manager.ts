import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../env';
import { MealPlan } from '../../../models/meal-plan.model';
import { Dish } from '../../../models/dish.model';

@Injectable({ providedIn: 'root' })
export class MenuManagerService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly mealPlansEndpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  /** ✅ Menüs laden (Liste) */
  getMenus(): Observable<MealPlan[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<any[]>(this.mealPlansEndpoint).pipe(
      catchError(err => {
        console.error('MenuManager getMenus failed:', err);
        return of([]);
      }),
      // ✅ normalize dishes, available default true
      // (kein rxjs map import nötig, wir machen es hier bewusst einfach)
      // @ts-ignore
      ((source$) => new Observable<MealPlan[]>(subscriber => {
        source$.subscribe({
          next: (rows: any[]) => {
            const menus = (rows ?? []).map((m: any) => ({
              id: String(m.id),
              title: m.title ?? '',
              isSelected: !!m.isSelected || !!m.is_selected,
              dishes: (Array.isArray(m.dishes) ? m.dishes : []).map((d: any): Dish => ({
                id: String(d.id),
                name: d.name ?? '',
                description: d.description ?? '',
                price: Number(d.price ?? 0),
                category: d.category ?? 'Hauptgericht',
                vegetarian: !!d.vegetarian,
                available: d.available !== false, // ✅ default true
                allergens: Array.isArray(d.allergens) ? d.allergens : (Array.isArray(d.allergenes) ? d.allergenes : []),
              })),
            })) as MealPlan[];

            subscriber.next(menus);
            subscriber.complete();
          },
          error: (e: any) => subscriber.error(e),
        });
      }))
    ) as any;
  }

  deleteMenu(id: string): Observable<void> {
    if (environment.useMockData) return of(void 0);
    return this.http.delete<void>(`${this.mealPlansEndpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('MenuManager deleteMenu failed:', err);
        return of(void 0);
      })
    );
  }

  /** ✅ Aktives Menü laden */
  getSelectedMealPlan(): Observable<MealPlan | null> {
    if (environment.useMockData) return of(null);

    return this.http.get<any>(`${this.mealPlansEndpoint}/selected`).pipe(
      catchError(err1 => {
        return this.http.get<any>(`${this.mealPlansEndpoint}/active`).pipe(
          catchError(err2 => {
            console.error('getSelectedMealPlan failed:', err1, err2);
            return of(null);
          })
        );
      }),
      // @ts-ignore
      ((source$) => new Observable<MealPlan | null>(subscriber => {
        source$.subscribe({
          next: (plan: any) => {
            if (!plan) {
              subscriber.next(null);
              subscriber.complete();
              return;
            }

            const dishes = (Array.isArray(plan.dishes) ? plan.dishes : []).map((d: any): Dish => ({
              id: String(d.id),
              name: d.name ?? '',
              description: d.description ?? '',
              price: Number(d.price ?? 0),
              category: d.category ?? 'Hauptgericht',
              vegetarian: !!d.vegetarian,
              available: d.available !== false, // ✅ default true
              allergens: Array.isArray(d.allergens) ? d.allergens : (Array.isArray(d.allergenes) ? d.allergenes : []),
            }));

            subscriber.next({
              id: String(plan.id),
              title: plan.title ?? '',
              isSelected: !!plan.isSelected || !!plan.is_selected,
              dishes,
            });
            subscriber.complete();
          },
          error: (e: any) => subscriber.error(e),
        });
      }))
    ) as any;
  }

  /**
   * ✅ Menü aktiv setzen:
   * Primär: PATCH /meal-plans/select   body { id }
   * Fallback: PATCH /meal-plans/:id/select body {}
   */
  setSelected(menuId: string): Observable<{ ok: boolean; id?: string }> {
    if (environment.useMockData) return of({ ok: true, id: menuId });
    const id = String(menuId ?? '').trim();
    if (!id) return of({ ok: false });

    const byBody$ = this.http.patch<{ ok: boolean; id?: string }>(
      `${this.mealPlansEndpoint}/select`,
      { id }
    );

    const byParam$ = this.http.patch<{ ok: boolean; id?: string }>(
      `${this.mealPlansEndpoint}/${encodeURIComponent(id)}/select`,
      {}
    );

    return byBody$.pipe(
      catchError(err1 => {
        return byParam$.pipe(
          catchError(err2 => {
            console.error('setSelected failed:', err1, err2);
            return of({ ok: false });
          })
        );
      })
    );
  }

  /** ✅ Menü Details holen */
  getMealPlanById(id: string): Observable<MealPlan | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<any>(`${this.mealPlansEndpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('MenuManager getMealPlanById failed:', err);
        return of(null);
      }),
      // @ts-ignore
      ((source$) => new Observable<MealPlan | null>(subscriber => {
        source$.subscribe({
          next: (plan: any) => {
            if (!plan) {
              subscriber.next(null);
              subscriber.complete();
              return;
            }
            const dishes = (Array.isArray(plan.dishes) ? plan.dishes : []).map((d: any): Dish => ({
              id: String(d.id),
              name: d.name ?? '',
              description: d.description ?? '',
              price: Number(d.price ?? 0),
              category: d.category ?? 'Hauptgericht',
              vegetarian: !!d.vegetarian,
              available: d.available !== false,
              allergens: Array.isArray(d.allergens) ? d.allergens : (Array.isArray(d.allergenes) ? d.allergenes : []),
            }));
            subscriber.next({
              id: String(plan.id),
              title: plan.title ?? '',
              isSelected: !!plan.isSelected || !!plan.is_selected,
              dishes,
            });
            subscriber.complete();
          },
          error: (e: any) => subscriber.error(e),
        });
      }))
    ) as any;
  }
}
