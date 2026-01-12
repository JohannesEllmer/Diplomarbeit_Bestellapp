import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../env';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminBalanceService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  confirm(code: string): Observable<any> {
    return this.http.patch(`${this.apiBase}/admin/users/balance/confirm`, { code });
  }
}
