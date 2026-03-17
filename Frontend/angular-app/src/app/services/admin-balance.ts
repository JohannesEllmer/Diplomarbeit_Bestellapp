import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ScanResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  balanceAfter?: number;
  alreadyUsed?: boolean;
  error?: string;
};

@Injectable({
  providedIn: 'root',
})
export class AdminBalanceService {
  private readonly baseUrl = '/api/admin/users';

  constructor(private http: HttpClient) {}

  confirm(code: string): Observable<ScanResult> {
    return this.http.patch<ScanResult>(
      `${this.baseUrl}/balance/confirm`,
      { code }
    );
  }
}