import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Chart,
  ChartConfiguration,
  ChartType,
  registerables
} from 'chart.js';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

import {
  StatisticsService,
  DayData,
  WeekData,
  StatOrder
} from '../services/statistics/statistics-service';

Chart.register(...registerables);

interface FinanceRow {
  label: string;
  orders: number;
  gross: number;
}

type Alert = { severity: 'info' | 'warn' | 'danger'; message: string };

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics-page.html',
  styleUrls: ['./statistics-page.css']
})
export class StatisticsPageComponent implements OnInit, AfterViewInit {
  showImpressumPopup = false;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;

  days: DayData[] = [];
  weeks: WeekData[] = [];

  startDate = '';
  endDate = '';

  selectedChartType: ChartType = 'bar';
  selectedDataset: 'revenue' | 'orders' = 'revenue';
  displayMode: 'days' | 'weeks' = 'days';

  totalOrders = 0;
  totalCustomers = 0;
  totalRevenue = 0;
  avgBasket = 0;

  previousOrders = 15;
  previousCustomers = 10;
  previousRevenue = 320;

  trendOrders: 'up' | 'down' = 'up';
  trendCustomers: 'up' | 'down' = 'up';
  trendRevenue: 'up' | 'down' = 'up';

  financeRows: FinanceRow[] = [];
  totals: FinanceRow = { label: 'Summe', orders: 0, gross: 0 };

  alerts: Alert[] = [];

  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true } }
  };

  private readonly COLORS = ['#3b82f6'];

  loading = false;

  constructor(private stats: StatisticsService) {}

  ngOnInit(): void {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    this.startDate = weekAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngAfterViewInit(): void {
    this.loadStatistics();
  }

  /* ---------------- Load ---------------- */

  loadStatistics(): void {
    this.loading = true;

    this.stats.getDays(this.startDate, this.endDate).subscribe(days => {
      this.days = days;
      this.calculateDisplayMode();

      if (this.displayMode === 'weeks') {
        this.stats.getWeeks(this.startDate, this.endDate).subscribe(w => {
          this.weeks = w;
          this.afterLoaded();
        });
      } else {
        this.weeks = [];
        this.afterLoaded();
      }
    });
  }

  private afterLoaded(): void {
    this.loading = false;
    this.calculateTotals();
    this.calculateTrends();
    this.recalculateFinance();
    this.updateChart();
  }

  /* ---------------- Calculations ---------------- */

  private calculateDisplayMode(): void {
    const diff =
      (new Date(this.endDate).getTime() -
        new Date(this.startDate).getTime()) /
      86400000;
    this.displayMode = diff > 10 ? 'weeks' : 'days';
  }

  private calculateTotals(): void {
    this.totalOrders = this.days.reduce(
      (s: number, d: DayData) => s + d.ordersList.length,
      0
    );

    this.totalRevenue = this.days.reduce(
      (s: number, d: DayData) =>
        s +
        d.ordersList.reduce(
          (ds: number, o: StatOrder) => ds + o.totalPrice,
          0
        ),
      0
    );

    const customers = new Set<string>();
    for (const d of this.days) {
      for (const o of d.ordersList) {
        if (o.user?.name) customers.add(o.user.name);
      }
    }

    this.totalCustomers = customers.size;
    this.avgBasket = this.totalOrders
      ? this.totalRevenue / this.totalOrders
      : 0;
  }

  calculateTrends(): void {
    this.trendOrders =
      this.totalOrders >= this.previousOrders ? 'up' : 'down';
    this.trendCustomers =
      this.totalCustomers >= this.previousCustomers ? 'up' : 'down';
    this.trendRevenue =
      this.totalRevenue >= this.previousRevenue ? 'up' : 'down';
  }

  /* ---------------- Finance ---------------- */

  recalculateFinance(): void {
    const rows: FinanceRow[] = [];

    if (this.displayMode === 'days') {
      for (const d of this.days) {
        rows.push({
          label: d.date,
          orders: d.ordersList.length,
          gross: d.ordersList.reduce(
            (s: number, o: StatOrder) => s + o.totalPrice,
            0
          )
        });
      }
    } else {
      for (const w of this.weeks) {
        rows.push({
          label: w.weekLabel,
          orders: w.totalOrders,
          gross: w.totalRevenue
        });
      }
    }

    this.financeRows = rows;
    this.totals = rows.reduce<FinanceRow>(
      (a, r) => ({
        label: 'Summe',
        orders: a.orders + r.orders,
        gross: a.gross + r.gross
      }),
      { label: 'Summe', orders: 0, gross: 0 }
    );

    this.alerts = [];
    if (!this.days.length) {
      this.alerts.push({
        severity: 'danger',
        message: 'Keine Bestellungen im Zeitraum.'
      });
    }
  }

  /* ---------------- Chart ---------------- */

  toggleChartType(type: ChartType): void {
    if (type === 'line' && this.days.length < 5) return;
    this.selectedChartType = type;
    this.updateChart();
  }

  updateChart(): void {
    if (!this.chartCanvas) return;
    if (this.chart) this.chart.destroy();

    const labels =
      this.displayMode === 'days'
        ? this.days.map(d => d.date)
        : this.weeks.map(w => w.weekLabel);

    const data =
      this.displayMode === 'days'
        ? this.days.map(d =>
            d.ordersList.reduce(
              (s: number, o: StatOrder) => s + o.totalPrice,
              0
            )
          )
        : this.weeks.map(w => w.totalRevenue);

    const cfg: ChartConfiguration = {
      type: this.selectedChartType,
      data: {
        labels,
        datasets: [
          {
            label: 'Umsatz (€)',
            data,
            backgroundColor: this.COLORS
          }
        ]
      },
      options: this.chartOptions
    };

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) this.chart = new Chart(ctx, cfg);
  }

  /* ---------------- PDF ---------------- */

  exportFinancePDF(): void {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.text('Finanzübersicht', 40, 40);

    const body: RowInput[] = this.financeRows.map(r => [
      r.label,
      r.orders.toString(),
      this.fmtEUR(r.gross)
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Datum', 'Bestellungen', 'Umsatz']],
      body
    });

    doc.save('finanzuebersicht.pdf');
  }

  private fmtEUR(v: number): string {
    return v.toLocaleString('de-AT', {
      style: 'currency',
      currency: 'EUR'
    });
  }

  goFullscreenMobile(): void {
    if (window.innerWidth <= 480) {
      const el = this.chartCanvas.nativeElement.parentElement;
      el?.requestFullscreen?.();
    }
  }
}
