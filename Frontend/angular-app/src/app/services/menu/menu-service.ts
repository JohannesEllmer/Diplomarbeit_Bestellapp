import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../env';
import { MenuItem } from '../../../models/menu-item.model';
import { MealPlan } from '../../../models/meal-plan.model';

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
        console.error('MenuService.getMenuItems failed:', err);
        return of([]);
      }),
    );
  }

  getSelectedMealPlan(): Observable<MealPlan | null> {
    if (environment.useMockData) return of(null);

    return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/selected`).pipe(
      catchError(err1 => {
        return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/active`).pipe(
          catchError(err2 => {
            console.error('MenuService.getSelectedMealPlan failed:', err1, err2);
            return of(null);
          }),
        );
      }),
    );
  }

  getMealPlanById(id: string): Observable<MealPlan | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<MealPlan>(`${this.mealPlansEndpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('MenuService.getMealPlanById failed:', err);
        return of(null);
      }),
    );
  }
}
