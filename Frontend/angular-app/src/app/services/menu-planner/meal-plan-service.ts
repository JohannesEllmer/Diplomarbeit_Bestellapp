import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { MealPlan } from '../../../models/meal-plan.model';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class MealPlanService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly endpoint = `${this.apiBase}/meal-plans`;

  constructor(private http: HttpClient) {}

  create(plan: MealPlan): Observable<MealPlan> {
    if (environment.useMockData) {
      return of({ ...plan, id: crypto.randomUUID() });
    }
 
    const payload = { ...plan, id: undefined as any };
    return this.http.post<MealPlan>(this.endpoint, payload);
  }

  update(id: string, plan: MealPlan): Observable<MealPlan> {
    if (environment.useMockData) return of(plan);
    return this.http.patch<MealPlan>(`${this.endpoint}/${id}`, plan);
  }
}
