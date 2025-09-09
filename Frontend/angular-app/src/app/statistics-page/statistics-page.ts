import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Wichtig: Chart.js-Elemente registrieren
Chart.register(...registerables);

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics-page.html',
  styleUrls: ['./statistics-page.css']
})
export class StatisticsPageComponent implements AfterViewInit {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart!: Chart;

  selectedRange: 'today' | 'yesterday' | 'week' | 'month' = 'today';
  selectedChartType: ChartType = 'bar';
  selectedDataset: string = 'revenue';

  totalOrders = 1234;
  totalCustomers = 456;
  totalRevenue = 7890;

  previousOrders = 1100;
  previousCustomers = 470;
  previousRevenue = 7200;

  trendOrders: 'up' | 'down' = 'up';
  trendCustomers: 'up' | 'down' = 'down';
  trendRevenue: 'up' | 'down' = 'up';

  availableDatasets = [
    { key: 'revenue', label: 'Umsatz' },
    { key: 'ordersByWeekday', label: 'Bestellungen nach Wochentag' },
    { key: 'avgOrderValue', label: 'Ø Bestellwert' },
    { key: 'ordersByDish', label: 'Bestellungen pro Gericht' }
  ];

  chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: []
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true }
    },
    scales: {
      x: {},
      y: { beginAtZero: true }
    }
  };

  private readonly COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ef4444', '#ec4899', '#6366f1', '#22d3ee'
  ];

  ngAfterViewInit(): void {
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.calculateTrends();
    this.updateChart();
  }

  calculateTrends(): void {
    this.trendOrders = this.totalOrders >= this.previousOrders ? 'up' : 'down';
    this.trendCustomers = this.totalCustomers >= this.previousCustomers ? 'up' : 'down';
    this.trendRevenue = this.totalRevenue >= this.previousRevenue ? 'up' : 'down';
  }

  updateChart(): void {
    if (!this.chartCanvas) return; // verhindert nativeElement-Fehler

    if (this.chart) {
      this.chart.destroy();
    }

    let labels: string[] = [];
    let data: number[] = [];
    let label = '';

    switch (this.selectedDataset) {
      case 'revenue':
        labels = ['KW1', 'KW2', 'KW3', 'KW4'];
        data = [2000, 2500, 1800, 2200];
        label = 'Umsatz';
        break;
      case 'ordersByWeekday':
        labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        data = [100, 120, 130, 140, 160, 180, 90];
        label = 'Bestellungen/Wochentag';
        break;
      case 'avgOrderValue':
        labels = ['KW1', 'KW2', 'KW3', 'KW4'];
        data = [22.5, 24.0, 23.8, 25.1];
        label = 'Ø Bestellwert';
        break;
      case 'ordersByDish':
        labels = ['Pizza Margherita', 'Schnitzel', 'Spaghetti', 'Salat', 'Burger'];
        data = [150, 120, 180, 90, 200];
        label = 'Bestellungen pro Gericht';
        break;
    }

    const backgroundColors = this.COLORS.slice(0, data.length);

    this.chartData = {
      labels,
      datasets: [{
        data,
        label,
        backgroundColor: backgroundColors,
        borderColor: this.selectedChartType === 'line' ? '#2563eb' : undefined,
        borderWidth: 2,
        fill: this.selectedChartType !== 'line',
        tension: this.selectedChartType === 'line' ? 0.4 : 0
      }]
    };

    this.createChart();
  }

  createChart(): void {
    const ctx = this.chartCanvas?.nativeElement?.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, {
        type: this.selectedChartType,
        data: this.chartData,
        options: this.chartOptions
      });
    }
  }

  exportChart(): void {
    if (!this.chartCanvas) return;
    const link = document.createElement('a');
    link.href = this.chartCanvas.nativeElement.toDataURL('image/png');
    link.download = 'diagramm.png';
    link.click();
  }

 goFullscreenMobile(): void {
  if (window.innerWidth <= 480) {
    if (!document.fullscreenElement) {
      // Vollbild starten
      const container = this.chartCanvas?.nativeElement?.parentElement;
      if (container && container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      // Vollbild beenden
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
}

}
