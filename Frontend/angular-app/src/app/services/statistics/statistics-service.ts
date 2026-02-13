import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { environment } from '../../env';

export type StatOrderItem = {
  quantity: number;
  note?: string | null;
  deliveryTime?: string | null; // ISO oder HH:MM
  menuItem: {
    id: string;
    name: string;
    price: number;
  };
};

export interface StatOrder {
  id: string;
  user?: { id?: string; name?: string | null };
  totalPrice: number;
  delivered?: boolean; 
  status?: 'open' | 'closed';
  createdAt?: string;
  items?: StatOrderItem[];
}

export interface DayData {
  date: string; // YYYY-MM-DD
  ordersList: StatOrder[];
}

export interface WeekData {
  weekLabel: string;
  totalOrders: number;
  totalRevenue: number;
}

interface OrderDto {
  id: string;
  user?: { id: string; name: string };
  totalPrice: number;
  createdAt: string | Date;
  status: 'open' | 'closed';
  items?: any[]; // kommt vom Backend als OrderResponseDto.items
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  constructor(private http: HttpClient) {}

  getDays(start: string, end: string): Observable<DayData[]> {
    return this.http.get<OrderDto[]>(`${this.apiBase}/admin/orders`).pipe(
      map(orders => this.groupByDay(orders ?? [], start, end)),
      catchError(() => of([]))
    );
  }

  getWeeks(start: string, end: string): Observable<WeekData[]> {
    return this.getDays(start, end).pipe(
      map(days => {
        const mapWeeks = new Map<string, { orders: number; revenue: number }>();

        for (const d of days) {
          const dt = new Date(d.date);
          const week = this.getWeekLabel(dt);

          if (!mapWeeks.has(week)) mapWeeks.set(week, { orders: 0, revenue: 0 });

          const w = mapWeeks.get(week)!;
          w.orders += d.ordersList.length;
          w.revenue += d.ordersList.reduce((s, o) => s + Number(o.totalPrice ?? 0), 0);
        }

        return Array.from(mapWeeks.entries()).map(([weekLabel, v]) => ({
          weekLabel,
          totalOrders: v.orders,
          totalRevenue: v.revenue,
        }));
      })
    );
  }

  private groupByDay(orders: OrderDto[], start: string, end: string): DayData[] {
    const s = new Date(start);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);

    const mapDays = new Map<string, StatOrder[]>();

    for (const o of orders) {
      const dt = new Date(o.createdAt);
      if (dt < s || dt > e) continue;

      const key = dt.toISOString().split('T')[0];
      if (!mapDays.has(key)) mapDays.set(key, []);

      const items: StatOrderItem[] = Array.isArray(o.items)
        ? o.items.map((x: any) => ({
            quantity: Number(x.quantity ?? 1),
            note: (x.note ?? null),
            deliveryTime: x.deliveryTime ?? null,
            menuItem: {
              id: String(x?.menuItem?.id ?? x?.menu_item_id ?? ''),
              name: String(x?.menuItem?.name ?? ''),
              price: Number(x?.menuItem?.price ?? 0),
            },
          }))
        : [];

      mapDays.get(key)!.push({
        id: String(o.id),
        user: o.user,
        totalPrice: Number(o.totalPrice ?? 0),
        status: o.status,
        delivered: o.status === 'closed',
        createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(o.createdAt).toISOString(),
        items, 
      });
    }

    return Array.from(mapDays.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ordersList]) => ({ date, ordersList }));
  }

  private getWeekLabel(d: Date): string {
    const first = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - first.getTime()) / 86400000);
    const week = Math.ceil((days + first.getDay() + 1) / 7);
    return `KW ${week}`;
  }
}
