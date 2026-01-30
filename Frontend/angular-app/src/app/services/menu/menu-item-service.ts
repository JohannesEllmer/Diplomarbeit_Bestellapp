import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import { environment } from '../env';
import { MenuItem } from '../../../models/menu-item.model';

export interface MenuItemDto {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  category?: string | null;
  available?: boolean | null;
  vegetarian?: boolean | null;
  allergens?: string[] | null;
  drink?: string | null;
  dessert?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MenuItemsApiService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly endpoint = `${this.apiBase}/menu-items`;

  constructor(private http: HttpClient) {}

  private toModel(dto: MenuItemDto): MenuItem {
    return {
      id: String(dto.id),
      name: dto.name ?? '',
      description: dto.description ?? '',
      price: Number(dto.price ?? 0),
      category: dto.category ?? '',
      available: dto.available !== false,
      vegetarian: !!dto.vegetarian,
      allergens: Array.isArray(dto.allergens) ? dto.allergens : [],
      drink: dto.drink ?? undefined,
      dessert: dto.dessert ?? undefined,
    };
  }

  private toDto(item: MenuItem): Partial<MenuItemDto> {
    return {
      id: item.id,
      name: item.name ?? '',
      description: item.description ?? '',
      price: Number(item.price ?? 0),
      category: item.category ?? '',
      available: item.available !== false,
      vegetarian: !!item.vegetarian,
      allergens: item.allergens ?? [],
      drink: item.drink ?? null,
      dessert: item.dessert ?? null,
    };
  }

  getAll(): Observable<MenuItem[]> {
    if (environment.useMockData) return of([]);
    return this.http.get<MenuItemDto[]>(this.endpoint).pipe(
      map(rows => (rows ?? []).map(r => this.toModel(r))),
      catchError(err => {
        console.error('MenuItemsApiService.getAll failed:', err);
        return of([]);
      }),
    );
  }

  getById(id: string): Observable<MenuItem | null> {
    if (!id) return of(null);
    if (environment.useMockData) return of(null);

    return this.http.get<MenuItemDto>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      map(dto => (dto ? this.toModel(dto) : null)),
      catchError(err => {
        console.error('MenuItemsApiService.getById failed:', err);
        return of(null);
      }),
    );
  }

  save(item: MenuItem): Observable<MenuItem> {
  const isNew = !item.id || item.id === '0' || item.id === 'new';

  if (isNew) {
    const { id, ...payload } = item;

    const cleaned = {
      ...payload,
      price: Number(payload.price ?? 0),
      drink: (payload.drink ?? '').trim() || undefined,
      dessert: (payload.dessert ?? '').trim() || undefined,
      allergens: Array.isArray(payload.allergens) ? payload.allergens : [],
    };

    return this.http.post<MenuItem>(this.endpoint, cleaned);
  }

  const { id, ...payload } = item;
  const cleaned = {
    ...payload,
    price: Number(payload.price ?? 0),
    drink: (payload.drink ?? '').trim() || undefined,
    dessert: (payload.dessert ?? '').trim() || undefined,
    allergens: Array.isArray(payload.allergens) ? payload.allergens : [],
  };

  return this.http.patch<MenuItem>(`${this.endpoint}/${encodeURIComponent(id)}`, cleaned);
}


  delete(id: string): Observable<void> {
    if (!id) return throwError(() => new Error('Missing menu item id'));
    if (environment.useMockData) return of(void 0);

    return this.http.delete<void>(`${this.endpoint}/${encodeURIComponent(id)}`).pipe(
      catchError(err => {
        console.error('MenuItemsApiService.delete failed:', err);
        return throwError(() => err);
      }),
    );
  }
}
