import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class MealPlanService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly endpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  create(payload: { title: string; dishIds?: string[] }): Observable<any> {
    if (environment.useMockData) return of({ id: crypto.randomUUID(), ...payload, dishes: [] });
    return this.http.post<any>(this.endpoint, payload);
  }

  update(id: string, payload: { title?: string }): Observable<any> {
    if (environment.useMockData) return of({ id, ...payload });
    return this.http.patch<any>(`${this.endpoint}/${encodeURIComponent(id)}`, payload);
  }

  // ✅ Drag&Drop Edit: add/remove sofort
  addDish(mealPlanId: string, dishId: string): Observable<any> {
    if (environment.useMockData) return of({ ok: true });
    return this.http.post<any>(
      `${this.endpoint}/${encodeURIComponent(mealPlanId)}/dishes/${encodeURIComponent(dishId)}`,
      {},
    );
  }

  removeDish(mealPlanId: string, dishId: string): Observable<any> {
    if (environment.useMockData) return of({ ok: true });
    return this.http.delete<any>(
      `${this.endpoint}/${encodeURIComponent(mealPlanId)}/dishes/${encodeURIComponent(dishId)}`,
    );
  }

  // ✅ Checkbox sofort
  setDishDisabled(mealPlanId: string, dishId: string, disabled: boolean): Observable<any> {
    if (environment.useMockData) return of({ ok: true });
    return this.http.patch<any>(
      `${this.endpoint}/${encodeURIComponent(mealPlanId)}/dishes/${encodeURIComponent(dishId)}/disabled`,
      { disabled },
    );
  }
}
