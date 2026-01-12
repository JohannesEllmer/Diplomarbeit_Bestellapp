import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, EMPTY, interval, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';

import { environment } from '../env'; // ✅ ggf. Pfad anpassen!
import { AuthService } from '../auth/auth.service';
import { AppNotification } from '../../models/notification.model';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: any): boolean {
  return UUID_RE.test(String(v ?? '').trim());
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly endpoint = `${this.apiBase}/notifications`;

  private readonly _notifications$ = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$ = this._notifications$.asObservable();

  private readonly _toast$ = new BehaviorSubject<AppNotification[]>([]);
  readonly toastNotifications$ = this._toast$.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {
    // ✅ Poll nur wenn eingeloggt UND id valide
    interval(5000)
      .pipe(
        switchMap(() => {
          if (!this.auth.isLoggedIn()) return EMPTY;
          const user = this.auth.getCurrentUser();
          const uid = user?.id;
          if (!isUuid(uid)) return EMPTY;
          return this.fetchLatest();
        }),
      )
      .subscribe();
  }

  /** ✅ Standard: JWT via Interceptor – KEINE manuellen Header nötig */
  fetchLatest(): Observable<AppNotification[]> {
    return this.http.get<unknown>(`${this.endpoint}/latest`).pipe(
      map((rows: unknown) => (Array.isArray(rows) ? rows : [])),
      map((rows: any[]) => rows.map((r: any) => this.mapRow(r))),
      tap((list: AppNotification[]) => {
        this._notifications$.next(list);

        // Toasts: nur unread, max 3
        const unread = list.filter(n => !n.read);
        this._toast$.next(unread.slice(0, 3));
      }),
      catchError((err) => {
        console.error('notifications latest failed', err);
        return of([] as AppNotification[]);
      }),
    );
  }

  /** ✅ Wenn du KEIN Interceptor hast, nutze diese Methode statt fetchLatest() */
  private fetchLatestWithToken(): Observable<AppNotification[]> {
    const token = this.auth.getToken?.() ?? null;

    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);

    return this.http.get<unknown>(`${this.endpoint}/latest`, { headers }).pipe(
      map((rows: unknown) => (Array.isArray(rows) ? rows : [])),
      map((rows: any[]) => rows.map((r: any) => this.mapRow(r))),
      tap((list: AppNotification[]) => {
        this._notifications$.next(list);
        const unread = list.filter(n => !n.read);
        this._toast$.next(unread.slice(0, 3));
      }),
      catchError((err) => {
        console.error('notifications latest failed', err);
        return of([] as AppNotification[]);
      }),
    );
  }

  private mapRow(r: any): AppNotification {
    return {
      id: String(r.id),
      type: String(r.type ?? ''),
      title: String(r.title ?? ''),
      message: String(r.message ?? ''),
      link: r.link ? String(r.link) : undefined,
      data: r.data ?? {},
      createdAt: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
      read: !!r.read || !!r.read_at || !!r.readAt,
      ttlMs: Number(r.ttlMs ?? 5000),
    };
  }

  markRead(id: string): void {
    const nid = String(id ?? '').trim();
    if (!isUuid(nid)) return;

    this.http.patch(`${this.endpoint}/${encodeURIComponent(nid)}/read`, {})
      .pipe(
        catchError((err) => {
          console.error('markRead failed', err);
          return of(null);
        })
      )
      .subscribe(() => {
        // UI sofort aktualisieren
        const next = this._notifications$.value.map(n =>
          n.id === nid ? { ...n, read: true } : n
        );
        this._notifications$.next(next);
        this._toast$.next(this._toast$.value.filter(t => t.id !== nid));
      });
  }

  clearAll(): void {
    this.http.delete(`${this.endpoint}/clear`)
      .pipe(
        catchError((err) => {
          console.error('clearAll failed', err);
          return of(null);
        })
      )
      .subscribe(() => {
        this._notifications$.next([]);
        this._toast$.next([]);
      });
  }

  dismissToast(id: string): void {
    const nid = String(id ?? '').trim();
    if (!isUuid(nid)) return;
    this._toast$.next(this._toast$.value.filter(t => t.id !== nid));
  }

  // Owner Übersicht
  loadOwnerToday(limit = 250): Observable<AppNotification[]> {
    const q = `?limit=${encodeURIComponent(String(limit))}`;
    return this.http.get<unknown>(`${this.endpoint}/owner/today${q}`).pipe(
      map((rows: unknown) => (Array.isArray(rows) ? rows : [])),
      map((rows: any[]) => rows.map((r: any) => this.mapRow(r))),
      catchError((err) => {
        console.error('owner today failed', err);
        return of([] as AppNotification[]);
      }),
    );
  }

  trackById(_: number, n: AppNotification): string {
    return String(n?.id ?? '');
  }
}
