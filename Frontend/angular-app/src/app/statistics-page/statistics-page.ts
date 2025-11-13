import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';

Chart.register(...registerables);

interface Order { id: number; user?: { name: string }; totalPrice: number; } 
interface DayData { date: string; ordersList: Order[]; }
interface WeekData { weekLabel: string; totalRevenue: number; totalOrders: number; }

interface FinanceRow {
  label: string;   
  orders: number;
  gross: number;   
}
type Alert = { severity: 'info'|'warn'|'danger'; message: string };

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
  endDate   = '';

  selectedChartType: ChartType = 'bar';
  selectedDataset: 'revenue' | 'orders' = 'revenue';
  displayMode: 'days' | 'weeks' = 'days';

  totalOrders = 0;
  totalCustomers = 0;
  totalRevenue = 0; 
  avgBasket = 0;

  previousOrders = 0;
  previousCustomers = 0;
  previousRevenue = 0;

  trendOrders: 'up'|'down' = 'up';
  trendCustomers: 'up'|'down' = 'down';
  trendRevenue: 'up'|'down' = 'up';

  financeRows: FinanceRow[] = [];
  totals: FinanceRow = { label: 'Summe', orders: 0, gross: 0 };

  alerts: Alert[] = [];

  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
    scales: { x: {}, y: { beginAtZero: true } }
  };

  private readonly COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#6366f1','#22d3ee'];

  ngOnInit(): void { this.initializeDates(); }
  ngAfterViewInit(): void { this.loadStatistics(); }

  private initializeDates(): void {
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    this.startDate = this.formatDate(oneWeekAgo);
    this.endDate   = this.formatDate(today);
  }
  private formatDate(date: Date): string { return date.toISOString().split('T')[0]; }

  loadStatistics(): void {
    this.loadDaysData();
    this.calculateDisplayMode();
    this.calculateWeeksData();
    this.calculateTotals();
    this.calculateTrends();
    this.recalculateFinance(); 
    this.updateChart();
  }

  private calculateDisplayMode(): void {
    if (!this.startDate || !this.endDate) return;
    const start = new Date(this.startDate);
    const end   = new Date(this.endDate);
    const diffDays = Math.max(1, Math.ceil(Math.abs(end.getTime() - start.getTime()) / 86400000));
    this.displayMode = diffDays > 10 ? 'weeks' : 'days';
  }

  loadDaysData(): void {
    this.days = [
      { date:'2024-01-15', ordersList:[{id:101,user:{name:'Max Mustermann'}, totalPrice:25.50},{id:102,user:{name:'Anna Schmidt'}, totalPrice:18.75},{id:103,user:{name:'Thomas Weber'}, totalPrice:32.00}] },
      { date:'2024-01-16', ordersList:[{id:104,user:{name:'Peter Müller'}, totalPrice:42.50},{id:105,user:{name:'Sabine Klein'}, totalPrice:28.90}] },
      { date:'2024-01-17', ordersList:[{id:106,user:{name:'Michael Bauer'}, totalPrice:35.75},{id:107,user:{name:'Julia Schmidt'}, totalPrice:22.40},{id:108,user:{name:'Robert Wolf'}, totalPrice:19.99}] },
      { date:'2024-01-18', ordersList:[{id:109,user:{name:'Sarah Meyer'}, totalPrice:45.20},{id:110,user:{name:'Daniel Koch'}, totalPrice:31.80}] },
      { date:'2024-01-19', ordersList:[{id:111,user:{name:'Lisa Fischer'}, totalPrice:28.50},{id:112,user:{name:'Kevin Schulz'}, totalPrice:36.90},{id:113,user:{name:'Maria Hoffmann'}, totalPrice:24.30}] },
      { date:'2024-01-20', ordersList:[{id:114,user:{name:'Christian Wagner'}, totalPrice:41.20}] },
      { date:'2024-01-21', ordersList:[{id:115,user:{name:'Jennifer Becker'}, totalPrice:29.80},{id:116,user:{name:'Stefan Schwarz'}, totalPrice:33.40}] }
    ];
  }
  private calculateWeeksData(): void {
    if (this.displayMode !== 'weeks') { this.weeks = []; return; }
    this.weeks = [
      { weekLabel:'KW 2', totalRevenue:845.60, totalOrders:18 },
      { weekLabel:'KW 3', totalRevenue:923.45, totalOrders:21 },
      { weekLabel:'KW 4', totalRevenue:789.30, totalOrders:17 },
      { weekLabel:'KW 5', totalRevenue:967.80, totalOrders:23 }
    ];
  }

  private calculateTotals(): void {
    this.totalOrders  = this.days.reduce((s, d) => s + d.ordersList.length, 0);
    this.totalRevenue = this.days.reduce((s, d) => s + d.ordersList.reduce((ds, o) => ds + o.totalPrice, 0), 0);
    const uniqueCustomers = new Set(this.days.flatMap(d => d.ordersList.map(o => o.user?.name).filter(Boolean)));
    this.totalCustomers = uniqueCustomers.size;
    this.avgBasket = this.totalOrders ? this.totalRevenue / this.totalOrders : 0;

    this.previousOrders = 15;
    this.previousCustomers = 10;
    this.previousRevenue = 320;
  }

  calculateTrends(): void {
    this.trendOrders    = this.totalOrders  >= this.previousOrders  ? 'up' : 'down';
    this.trendCustomers = this.totalCustomers >= this.previousCustomers ? 'up' : 'down';
    this.trendRevenue   = this.totalRevenue >= this.previousRevenue ? 'up' : 'down';
  }

  // Finance 
  recalculateFinance(): void {
    const rows: FinanceRow[] = [];
    if (this.displayMode === 'days') {
      for (const d of this.days) {
        const gross = d.ordersList.reduce((s,o)=>s+o.totalPrice,0); 
        rows.push({ label: d.date, orders: d.ordersList.length, gross });
      }
    } else {
      for (const w of this.weeks) {
        const gross = w.totalRevenue; 
        rows.push({ label: w.weekLabel, orders: w.totalOrders, gross });
      }
    }
    this.financeRows = rows;

    this.totals = rows.reduce<FinanceRow>((acc,r)=>({
      label:'Summe',
      orders: acc.orders + r.orders,
      gross:  acc.gross  + r.gross
    }), { label:'Summe', orders:0, gross:0 });

    this.buildAlerts();
  }

  private buildAlerts(): void {
    const alerts: Alert[] = [];
    if (this.trendRevenue === 'down') {
      alerts.push({ severity:'warn', message: 'Umsatz unter Vorperiode – Maßnahmen prüfen (Marketing/Preise/Sortiment).' });
    }
    if (!this.days.length) {
      alerts.push({ severity:'danger', message: 'Keine Bestelldaten im gewählten Zeitraum.' });
    }
    this.alerts = alerts;
  }

  //Chart 
  toggleChartType(type: ChartType): void {
    if (type === 'line' && this.days.length < 5) return;
    this.selectedChartType = type;
    this.updateChart();
  }
  updateChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    if (this.chart) this.chart.destroy();
    this.chartData = this.prepareChartData();
    this.createChart();
  }
  private prepareChartData(): ChartConfiguration['data'] {
    let labels: string[] = [];
    let data: number[] = [];
    let label = '';

    if (this.displayMode === 'days') {
      labels = this.days.map(d => {
        const dt = new Date(d.date);
        return dt.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit' });
      });
      if (this.selectedDataset === 'revenue') {
        data = this.days.map(d => d.ordersList.reduce((s,o)=>s+o.totalPrice,0));
        label = 'Umsatz (€)';
      } else {
        data = this.days.map(d => d.ordersList.length);
        label = 'Bestellungen';
      }
    } else {
      labels = this.weeks.map(w => w.weekLabel);
      if (this.selectedDataset === 'revenue') {
        data = this.weeks.map(w => w.totalRevenue);
        label = 'Umsatz (€)';
      } else {
        data = this.weeks.map(w => w.totalOrders);
        label = 'Bestellungen';
      }
    }

    return {
      labels,
      datasets: [{
        data,
        label,
        backgroundColor: this.COLORS.slice(0, Math.max(1,data.length)),
        borderColor: this.selectedChartType === 'line' ? '#2563eb' : undefined,
        borderWidth: this.selectedChartType === 'line' ? 3 : 2,
        fill: this.selectedChartType !== 'line',
        tension: this.selectedChartType === 'line' ? 0.4 : 0
      }]
    };
  }
  createChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chart = new Chart(ctx, {
      type: this.selectedChartType,
      data: this.chartData,
      options: this.chartOptions
    });
  }

  // PDF Export 
  exportFinancePDF(): void {
    const doc = new jsPDF({ orientation:'portrait', unit:'pt', format:'a4' });

    doc.setFont('helvetica','bold'); doc.setFontSize(16);
    doc.text('Finanzübersicht', 40, 40);

    
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    doc.text(`Zeitraum: ${this.startDate} bis ${this.endDate}`, 40, 58);

    const chartEl = this.chartCanvas?.nativeElement;
    if (chartEl) {
      const png = chartEl.toDataURL('image/png', 1.0);
      const imgW = 515, imgH = (chartEl.height / chartEl.width) * imgW;
      doc.addImage(png, 'PNG', 40, 72, imgW, Math.min(imgH, 220));
    }

    const body: RowInput[] = this.financeRows.map(r => ([
      r.label,
      r.orders.toString(),
      this.fmtEUR(r.gross),
    ]));
    const footer: RowInput = [
      'Summe',
      this.totalOrders.toString(),
      this.fmtEUR(this.totals.gross),
    ];

    autoTable(doc, {
      startY: 72 + 240,
      head:[['Datum / Woche','Bestellungen','Umsatz Brutto']],
      body,
      foot:[footer],
      styles: { font:'helvetica', fontSize:10, cellPadding:4, halign:'right' },
      headStyles: { fillColor:[2,132,199], textColor:255, halign:'right' },
      columnStyles: { 0: { halign:'left' } },
      footStyles: { fillColor:[248,250,252], textColor:[17,24,39], fontStyle:'bold' },
      didDrawPage: () => {
        const str = `Seite ${doc.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 20, { align:'right' });
      }
    });

    const filename = `finanzuebersicht_${this.startDate}_${this.endDate}.pdf`;
    doc.save(filename);
  }

  private fmtEUR(v: number): string {
    return v.toLocaleString('de-AT', { style:'currency', currency:'EUR' });
  }

  goFullscreenMobile(): void {
    if (window.innerWidth <= 480) {
      const el = this.chartCanvas?.nativeElement?.parentElement;
      if (!el) return;
      if (!document.fullscreenElement && (el as any).requestFullscreen) (el as any).requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();
    }
  }
}
