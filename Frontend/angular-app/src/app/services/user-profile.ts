import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/users/me/profile`).pipe(
      catchError((err) => {
        console.error('getProfile failed:', err);
        throw err;
      })
    );
  }

  getActivity(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/users/me/activity`).pipe(
      catchError((err) => {
        console.error('getActivity failed:', err);
        throw err;
      })
    );
  }

  createAddRequest(delta: number): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/users/me/balance-requests/add`, { delta }).pipe(
      catchError((err) => {
        console.error('createAddRequest failed:', err);
        throw err;
      })
    );
  }

  createFlushRequest(): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/users/me/balance-requests/flush`, {}).pipe(
      catchError((err) => {
        console.error('createFlushRequest failed:', err);
        throw err;
      })
    );
  }

  deleteMe(): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/users/me`).pipe(
      catchError((err) => {
        console.error('deleteMe failed:', err);
        throw err;
      })
    );
  }

  updateMyClass(newClass: string): Observable<{ ok: true; user: any }> {
    return this.http.patch<{ ok: true; user: any }>(
      `${this.apiBase}/users/me/class`,
      { class: String(newClass ?? '').trim() }
    ).pipe(
      catchError((err) => {
        console.error('updateMyClass failed:', err);
        throw err;
      })
    );
  }
}
