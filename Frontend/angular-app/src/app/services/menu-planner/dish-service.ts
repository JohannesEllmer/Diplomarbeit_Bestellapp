import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../env';
import { Dish } from '../../../models/dish.model';

export interface DishDto {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  allergenes?: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class DishService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly dishesEndpoint = `${this.apiBase}/dishes`;

  constructor(private http: HttpClient) {}

  private toDish(dto: DishDto): Dish {
    return {
      id: String(dto.id),
      name: dto.name ?? '',
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),

      category: 'Hauptgericht',
      available: true,       // ✅ default true (global dish verfügbar)
      vegetarian: false,
      allergens: Array.isArray(dto.allergenes) ? dto.allergenes : [],
    };
  }

  getDishes(): Observable<Dish[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<DishDto[]>(this.dishesEndpoint).pipe(
      map((rows) => (rows ?? []).map((d) => this.toDish(d))),
      catchError((err) => {
        console.error('getDishes failed:', err);
        return of([]);
      })
    );
  }

  getDishById(id: string): Observable<Dish | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<DishDto>(`${this.dishesEndpoint}/${encodeURIComponent(id)}`).pipe(
      map((dto) => (dto ? this.toDish(dto) : null)),
      catchError((err) => {
        console.error('getDishById failed:', err);
        return of(null);
      })
    );
  }
}
