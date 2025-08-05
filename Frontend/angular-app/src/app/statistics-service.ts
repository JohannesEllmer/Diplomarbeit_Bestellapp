import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Statistics {
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  topDishes: { title: string; count: number }[]; // ← wird verwendet
  topCustomers: { name: string; count: number }[];
  revenueData: number[];
  revenueLabels: string[];
}



@Injectable({ providedIn: 'root' })
export class StatisticsService {
  constructor(private http: HttpClient) {}

  getStatistics(range: 'today' | 'yesterday' | 'week' | 'month'): Observable<Statistics> {
    return this.http.get<Statistics>(`/api/statistics?range=${range}`);
  }
}
