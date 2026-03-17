import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../env';

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
  //private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  preview(code: string): Observable<BalancePreviewResult> {
    return this.http.post<BalancePreviewResult>(
      `${environment.apiBaseUrl}/admin/users/balance/preview`,
      { code }
    );
  }

  confirm(code: string): Observable<ScanResult> {
    return this.http.post<ScanResult>(
      `${environment.apiBaseUrl}/admin/users/balance/confirm`,
      { code }
    );
  }
}