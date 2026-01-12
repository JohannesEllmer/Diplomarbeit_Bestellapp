import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MenuItem } from '../../../models/menu-item.model';
import { MealPlan } from '../../../models/meal-plan.model';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly menuItemsEndpoint = `${this.apiBase}/menu-items`;
  private readonly mealPlansEndpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<MenuItem[]>(this.menuItemsEndpoint).pipe(
      catchError(err => {
        console.error('getMenuItems failed:', err);
        return of([]);
      })
    );
  }

  /** ✅ Kundenansicht: aktuell aktiviertes Menü */
  getSelectedMealPlan(): Observable<MealPlan | null> {
    if (environment.useMockData) return of(null);

    // robust: /selected -> fallback /active
    return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/selected`).pipe(
      catchError(err1 => {
        return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/active`).pipe(
          catchError(err2 => {
            console.error('getSelectedMealPlan failed:', err1, err2);
            return of(null);
          })
        );
      })
    );
  }

  /** ✅ Wichtig für “Menü hat keine Gerichte”: Details per ID laden */
  getMealPlanById(id: string): Observable<MealPlan | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('getMealPlanById failed:', err);
        return of(null);
      })
    );
  }
}
