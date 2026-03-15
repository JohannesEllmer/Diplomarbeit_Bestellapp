import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

type ScanResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  balanceAfter?: number;
  alreadyUsed?: boolean;
};

type BalancePreviewResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  alreadyUsed?: boolean;
};

@Injectable({ providedIn: 'root' })
export class AdminBalanceService {
  constructor(private http: HttpClient) {}

  preview(code: string): Observable<BalancePreviewResult> {
    return this.http.post<BalancePreviewResult>('/api/admin/balance/preview', { code });
  }

  confirm(code: string): Observable<ScanResult> {
    return this.http.post<ScanResult>('/api/admin/balance/confirm', { code });
  }
}