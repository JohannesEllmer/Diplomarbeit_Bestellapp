import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../env';
import { MenuItem } from '../../../models/menu-item.model';
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

  private toMenuItem(dto: DishDto): MenuItem {
    return {
      id: dto.id,
      name: dto.name ?? '',
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),
      category: 'Hauptgericht',
      available: true,
      vegetarian: false,
      allergens: (dto.allergenes ?? []) as string[]
    };
  }

  private toDishDto(item: MenuItem): Partial<DishDto> {
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      price: Number(item.price ?? 0),
      allergenes: item.allergens ?? []
    };
  }

  getDishes(): Observable<MenuItem[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<DishDto[]>(this.dishesEndpoint).pipe(
      map(rows => (rows ?? []).map(d => this.toMenuItem(d))),
      catchError(err => {
        console.error('getDishes failed:', err);
        return of([]);
      })
    );
  }
  


    private toDish(dto: DishDto): Dish {
    return {
      id: String(dto.id),
      name: dto.name ?? '',
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),

      category: 'Hauptgericht',
      available: true,       
      vegetarian: false,
      allergens: Array.isArray(dto.allergenes) ? dto.allergenes : [],
    };
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


  

 

  saveDish(dish: MenuItem): Observable<MenuItem> {
    if (environment.useMockData) {
      const id =
        dish.id && dish.id !== '0' && dish.id !== 'new' ? dish.id : crypto.randomUUID();
      return of({ ...dish, id });
    }

    const payload = this.toDishDto(dish);
    const isNew = !dish.id || dish.id === '0' || dish.id === 'new';

    if (isNew) {
      return this.http.post<DishDto>(this.dishesEndpoint, payload).pipe(
        map(dto => this.toMenuItem(dto)),
        catchError(err => {
          console.error('saveDish POST failed:', err);
          return throwError(() => err); // <-- wichtig: kein fake fallback
        })
      );
    }

    return this.http.patch<DishDto>(`${this.dishesEndpoint}/${dish.id}`, payload).pipe(
      map(dto => this.toMenuItem(dto)),
      catchError(err => {
        console.error('saveDish PATCH failed:', err);
        return throwError(() => err);
      })
    );
  }

 deleteDish(id: string): Observable<void> {
  if (!id) return throwError(() => new Error('Missing dish id'));
  if (environment.useMockData) return of(void 0);

  return this.http.delete<void>(`${this.dishesEndpoint}/${encodeURIComponent(id)}`).pipe(
    catchError(err => {
      console.error('deleteDish failed:', err);
      return throwError(() => err);
    })
  );
}

}
