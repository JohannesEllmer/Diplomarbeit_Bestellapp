import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface Statistics {
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  topDishes: { title: string; count: number }[];
  topCustomers: { name: string; count: number }[];
  revenueData: number[];
  revenueLabels: string[];
}

export interface Order {
  id: number;
  user?: { name: string };
  totalPrice: number;
}

export interface DayData {
  date: string;
  ordersList: Order[];
}

export interface WeekData {
  weekLabel: string;
  totalRevenue: number;
  totalOrders: number;
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly apiUrl = '/api/statistics';
  private readonly requestTimeoutMs = 1500;

  /**
   * Mock-Daten – bisher in der Component, jetzt zentral im Service
   */
  private readonly mockDays: DayData[] = [
    {
      date: '2024-01-15',
      ordersList: [
        { id: 101, user: { name: 'Max Mustermann' }, totalPrice: 25.5 },
        { id: 102, user: { name: 'Anna Schmidt' }, totalPrice: 18.75 },
        { id: 103, user: { name: 'Thomas Weber' }, totalPrice: 32.0 }
      ]
    },
    {
      date: '2024-01-16',
      ordersList: [
        { id: 104, user: { name: 'Peter Müller' }, totalPrice: 42.5 },
        { id: 105, user: { name: 'Sabine Klein' }, totalPrice: 28.9 }
      ]
    },
    {
      date: '2024-01-17',
      ordersList: [
        { id: 106, user: { name: 'Michael Bauer' }, totalPrice: 35.75 },
        { id: 107, user: { name: 'Julia Schmidt' }, totalPrice: 22.4 },
        { id: 108, user: { name: 'Robert Wolf' }, totalPrice: 19.99 }
      ]
    },
    {
      date: '2024-01-18',
      ordersList: [
        { id: 109, user: { name: 'Sarah Meyer' }, totalPrice: 45.2 },
        { id: 110, user: { name: 'Daniel Koch' }, totalPrice: 31.8 }
      ]
    },
    {
      date: '2024-01-19',
      ordersList: [
        { id: 111, user: { name: 'Lisa Fischer' }, totalPrice: 28.5 },
        { id: 112, user: { name: 'Kevin Schulz' }, totalPrice: 36.9 },
        { id: 113, user: { name: 'Maria Hoffmann' }, totalPrice: 24.3 }
      ]
    },
    {
      date: '2024-01-20',
      ordersList: [
        { id: 114, user: { name: 'Christian Wagner' }, totalPrice: 41.2 }
      ]
    },
    {
      date: '2024-01-21',
      ordersList: [
        { id: 115, user: { name: 'Jennifer Becker' }, totalPrice: 29.8 },
        { id: 116, user: { name: 'Stefan Schwarz' }, totalPrice: 33.4 }
      ]
    }
  ];

  private readonly mockWeeks: WeekData[] = [
    { weekLabel: 'KW 2', totalRevenue: 845.6, totalOrders: 18 },
    { weekLabel: 'KW 3', totalRevenue: 923.45, totalOrders: 21 },
    { weekLabel: 'KW 4', totalRevenue: 789.3, totalOrders: 17 },
    { weekLabel: 'KW 5', totalRevenue: 967.8, totalOrders: 23 }
  ];

  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------------------------
  // High-Level Statistiken (für Cards / Top-Listen / einfache Charts)
  // ---------------------------------------------------------------------------

  getStatistics(
    range: 'today' | 'yesterday' | 'week' | 'month'
  ): Observable<Statistics> {
    const url = `${this.apiUrl}?range=${range}`;
    return this.http.get<Statistics>(url).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn('getStatistics: Timeout – nutze Mock-Statistiken');
          return of(this.buildMockStatistics());
        }
      }),
      catchError(err => {
        console.error('getStatistics: Fehler – nutze Mock-Statistiken:', err);
        return of(this.buildMockStatistics());
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Rohdaten (für deine bestehende Auswertung in StatisticsPageComponent)
  // ---------------------------------------------------------------------------

  getDays(startDate: string, endDate: string): Observable<DayData[]> {
    const url = `${this.apiUrl}/days?start=${startDate}&end=${endDate}`;
    return this.http.get<DayData[]>(url).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn('getDays: Timeout – nutze mockDays');
          return of(this.filterMockDaysByRange(startDate, endDate));
        }
      }),
      catchError(err => {
        console.error('getDays: Fehler – nutze mockDays:', err);
        return of(this.filterMockDaysByRange(startDate, endDate));
      })
    );
  }

  getWeeks(startDate: string, endDate: string): Observable<WeekData[]> {
    const url = `${this.apiUrl}/weeks?start=${startDate}&end=${endDate}`;
    return this.http.get<WeekData[]>(url).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn('getWeeks: Timeout – nutze mockWeeks');
          return of(this.mockWeeks);
        }
      }),
      catchError(err => {
        console.error('getWeeks: Fehler – nutze mockWeeks:', err);
        return of(this.mockWeeks);
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen für Fallback / Mock-Auswertung
  // ---------------------------------------------------------------------------

  private buildMockStatistics(): Statistics {
    const totalOrders = this.mockDays.reduce(
      (sum, day) => sum + day.ordersList.length,
      0
    );
    const totalRevenue = this.mockDays.reduce(
      (sum, day) =>
        sum +
        day.ordersList.reduce((ds, o) => ds + o.totalPrice, 0),
      0
    );
    const uniqueCustomers = new Set(
      this.mockDays
        .flatMap(d => d.ordersList.map(o => o.user?.name))
        .filter(Boolean) as string[]
    );
    const totalCustomers = uniqueCustomers.size;

    const revenueLabels = this.mockDays.map(d => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit'
      });
    });
    const revenueData = this.mockDays.map(d =>
      d.ordersList.reduce((s, o) => s + o.totalPrice, 0)
    );

    // Top-Kunden aus mockDays
    const customerCounts = new Map<string, number>();
    for (const d of this.mockDays) {
      for (const o of d.ordersList) {
        const name = o.user?.name;
        if (!name) continue;
        customerCounts.set(name, (customerCounts.get(name) ?? 0) + 1);
      }
    }
    const topCustomers = Array.from(customerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Für Top-Dishes fehlen Infos → leer lassen (kannst du später ergänzen)
    const topDishes: { title: string; count: number }[] = [];

    return {
      totalOrders,
      totalCustomers,
      totalRevenue,
      topDishes,
      topCustomers,
      revenueData,
      revenueLabels
    };
  }

  private filterMockDaysByRange(startDate: string, endDate: string): DayData[] {
    if (!startDate || !endDate) return this.mockDays;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return this.mockDays.filter(d => {
      const dd = new Date(d.date);
      return dd >= start && dd <= end;
    });
  }
}
