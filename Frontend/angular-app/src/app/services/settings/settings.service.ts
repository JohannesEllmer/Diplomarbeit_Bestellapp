import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../env';

export type OrderingState = { orderingEnabled: boolean };
export type SetOrderingResponse = { ok: boolean; orderingEnabled: boolean };

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly orderingUrl = `${this.apiBase}/app-settings/ordering`;

  constructor(private http: HttpClient) {}

  getOrderingEnabled(): Observable<OrderingState> {
    return this.http.get<OrderingState>(this.orderingUrl).pipe(
      catchError((err: unknown) => {
        console.error('SettingsService.getOrderingEnabled failed:', err);
        // fallback: wenn API nicht erreichbar -> true (App offen)
        return of({ orderingEnabled: true });
      })
    );
  }

  setOrderingEnabled(orderingEnabled: boolean): Observable<SetOrderingResponse> {
    return this.http
      .patch<SetOrderingResponse>(this.orderingUrl, { orderingEnabled })
      .pipe(
        catchError((err: unknown) => {
          console.error('SettingsService.setOrderingEnabled failed:', err);
          return throwError(() => err);
        })
      );
  }
}
