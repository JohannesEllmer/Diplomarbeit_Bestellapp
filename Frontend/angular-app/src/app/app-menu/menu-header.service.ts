import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { environment } from '../env';

export interface MenuHeader {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  orderCount: number;
  blocked: boolean;
  class?: string;
}

const EMPTY_HEADER: MenuHeader = {
  id: '',
  name: '',
  email: '',
  role: '',
  balance: 0,
  orderCount: 0,
  blocked: false,
};

@Injectable({ providedIn: 'root' })
export class MenuHeaderService {
  private readonly apiUrl = environment.apiBaseUrl;

  private readonly headerSubject = new BehaviorSubject<MenuHeader>(EMPTY_HEADER);

  /** ✅ Observable für Komponenten */
  readonly header$ = this.headerSubject.asObservable();

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  /** ✅ Rückwärtskompatibel zu deinem AppMenu: watchHeader() */
  watchHeader(): Observable<MenuHeader> {
    return this.header$;
  }

  /**
   * 🔁 Lädt den Header neu.
   * ⚠️ Wichtig: Wenn du refresh() ohne subscribe() aufrufst,
   * passiert sonst kein HTTP Call.
   *
   * Daher: wir subscriben intern, geben aber trotzdem das Observable zurück,
   * falls du es woanders sauber chainen willst.
   */
  refresh(): Observable<MenuHeader | null> {
    // ⛔ niemals API call ohne Token
    if (!this.auth.isLoggedIn()) {
      this.headerSubject.next(EMPTY_HEADER);
      return of(null);
    }

    const req$ = this.http
      .get<MenuHeader>(`${this.apiUrl}/users/me/header`)
      .pipe(
        tap(header => {
          this.headerSubject.next({
            ...header,
            balance: Number((header as any).balance ?? 0),
            orderCount: Number((header as any).orderCount ?? 0),
            blocked: !!(header as any).blocked,
          });
        }),
        catchError(err => {
          console.error('[MenuHeader] load failed', err);
          this.headerSubject.next(EMPTY_HEADER);
          return of(null);
        })
      );

    // ✅ Damit refresh() auch wirkt, wenn caller nicht subscribed:
    req$.subscribe();

    return req$;
  }

  /** z.B. beim Logout */
  clear(): void {
    this.headerSubject.next(EMPTY_HEADER);
  }
}
