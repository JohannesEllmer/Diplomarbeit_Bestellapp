// src/app/services/dish-editor/dish-editor.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../env';
import { MenuItem } from '../../../models/menu-item.model';

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

  // ------------------------------
  // Mapper: DishDto -> MenuItem
  // ------------------------------
  private toMenuItem(dto: DishDto): MenuItem {
    return {
      id: dto.id,
      name: dto.name ?? '',
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),

      // Defaults, weil DishDto diese Felder nicht hat:
      category: 'Hauptgericht',
      available: true,
      vegetarian: false,
      allergens: (dto.allergenes ?? []) as string[],
    };
  }

  // ------------------------------
  // Mapper: MenuItem -> DishDto
  // ------------------------------
  private toDishDto(item: MenuItem): Partial<DishDto> {
    return {
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      price: Number(item.price ?? 0),
      allergenes: item.allergens ?? [],
    };
  }

  // ------------------------------
  // API: Alle Gerichte holen
  // -> liefert MenuItem[] (Frontend-Model)
  // ------------------------------
  getDishes(): Observable<MenuItem[]> {
    if (environment.useMockData) return of([]);

    return this.http.get<DishDto[]>(this.dishesEndpoint).pipe(
      map((rows) => (rows ?? []).map((d) => this.toMenuItem(d))),
      catchError((err) => {
        console.error('getDishes failed:', err);
        return of([]);
      })
    );
  }

  // ------------------------------
  // API: Gericht by id
  // -> liefert MenuItem | null
  // ------------------------------
  getDishById(id: string): Observable<MenuItem | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<DishDto>(`${this.dishesEndpoint}/${id}`).pipe(
      map((dto) => (dto ? this.toMenuItem(dto) : null)),
      catchError((err) => {
        console.error('getDishById failed:', err);
        return of(null);
      })
    );
  }

  // ------------------------------
  // API: Speichern (neu/ändern)
  // -> nimmt MenuItem und gibt MenuItem zurück
  // ------------------------------
  saveDish(dish: MenuItem): Observable<MenuItem> {
    if (environment.useMockData) {
      const id = dish.id && dish.id !== '0' && dish.id !== 'new' ? dish.id : crypto.randomUUID();
      return of({ ...dish, id });
    }

    const payload = this.toDishDto(dish);

    // du nutzt im Editor id '0' als neu -> hier korrekt behandeln
    const isNew = !dish.id || dish.id === '0' || dish.id === 'new';

    if (isNew) {
      return this.http.post<DishDto>(this.dishesEndpoint, payload).pipe(
        map((dto) => this.toMenuItem(dto)),
        catchError((err) => {
          console.error('saveDish POST failed:', err);
          // fallback: gib trotzdem das Dish zurück, damit UI nicht stirbt
          return of({ ...dish, id: dish.id || '0' });
        })
      );
    }

    // Update: bei dir eher PATCH
    return this.http.patch<DishDto>(`${this.dishesEndpoint}/${dish.id}`, payload).pipe(
      map((dto) => this.toMenuItem(dto)),
      catchError((err) => {
        console.error('saveDish PATCH failed:', err);
        return of(dish);
      })
    );
  }

  // ------------------------------
  // API: Löschen
  // ------------------------------
  deleteDish(id: string): Observable<void> {
    if (environment.useMockData) return of(void 0);

    return this.http.delete<void>(`${this.dishesEndpoint}/${id}`).pipe(
      catchError((err) => {
        console.error('deleteDish failed:', err);
        return of(void 0);
      })
    );
  }
}
