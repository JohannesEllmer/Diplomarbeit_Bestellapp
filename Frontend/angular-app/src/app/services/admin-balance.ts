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

export type BalancePreviewResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  alreadyUsed?: boolean;
  kind?: 'add' | 'flush' | string;
  currentBalance?: number;
  previewBalanceAfter?: number;
  error?: string;
};

@Injectable({
  providedIn: 'root',
})
export class AdminBalanceService {
  private readonly baseUrl = '/api/admin/users';

  constructor(private http: HttpClient) {}

  preview(code: string): Observable<BalancePreviewResult> {
    return this.http.post<BalancePreviewResult>(
      `${this.baseUrl}/balance/preview`,
      { code }
    );
  }

  confirm(code: string): Observable<ScanResult> {
    return this.http.post<ScanResult>(
      `${this.baseUrl}/balance/confirm`,
      { code }
    );
  }
}