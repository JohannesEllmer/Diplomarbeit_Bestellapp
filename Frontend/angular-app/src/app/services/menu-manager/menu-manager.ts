import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../env';
import { MealPlan } from '../../../models/meal-plan.model';

@Injectable({ providedIn: 'root' })
export class MenuManagerService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';

  private readonly mealPlansEndpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  getMenus(): Observable<MealPlan[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<MealPlan[]>(this.mealPlansEndpoint).pipe(
      catchError(err => {
        console.error('MenuManager getMenus failed:', err);
        return of([]);
      })
    );
  }

  deleteMenu(id: string): Observable<void> {
    if (environment.useMockData) return of(void 0);

    return this.http.delete<void>(`${this.mealPlansEndpoint}/${id}`).pipe(
      catchError(err => {
        console.error('MenuManager deleteMenu failed:', err);
        return of(void 0);
      })
    );
  }
}
