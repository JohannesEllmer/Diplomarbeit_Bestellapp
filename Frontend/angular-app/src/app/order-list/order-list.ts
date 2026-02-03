import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Order } from '../../models/menu-item.model';
import { AdminOrderService } from '../services/order/admin-order.service';
import { SiteFooterComponent } from '../site-footer/footer';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SiteFooterComponent],
  templateUrl: './order-list.html',
  styleUrls: ['./order-list.css']
})
export class OrderListComponent implements OnInit, OnDestroy {
  activeGroup: string = 'Keine Gruppierung';
  readonly groupOptions = ['Keine Gruppierung', 'Nach Gericht', 'Nach Lieferzeit'];

  orders: Order[] = [];
  openOrders: Order[] = [];
  completedOrders: Order[] = [];
  showImpressumPopup = false;
  paginatedOrders: Order[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  pages: number[] = [];

  completedCollapsed = true;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private adminOrders: AdminOrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders(true);

    // ✅ alle 2 Minuten automatisch aktualisieren
    interval(2 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadOrders(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * @param resetPage true = beim Initialload
   */
  loadOrders(resetPage: boolean): void {
    const prevPage = this.currentPage;
    const prevTotal = this.openOrders.length;

    this.adminOrders.getOrders().subscribe((orders) => {
      const all = orders ?? [];
      this.orders = all;

      this.openOrders = all.filter(o => String(o.status ?? '') !== 'closed');
      this.completedOrders = all.filter(o => String(o.status ?? '') === 'closed');

      const newTotalPages = Math.max(
        1,
        Math.ceil(this.openOrders.length / this.itemsPerPage)
      );

      // ✅ Seite beibehalten, wenn möglich
      if (resetPage) {
        this.currentPage = 1;
      } else if (prevPage > newTotalPages) {
        this.currentPage = newTotalPages;
      } else {
        this.currentPage = prevPage;
      }

      this.updatePagination();
    });
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedOrders = this.openOrders.slice(start, end);
    this.updatePages();
  }

  updatePages(): void {
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  changeItemsPerPage(count: number): void {
    this.itemsPerPage = count;
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalPages(): number {
    return this.openOrders.length === 0
      ? 1
      : Math.ceil(this.openOrders.length / this.itemsPerPage);
  }

  get totalSum(): number {
    return this.openOrders.reduce((sum, o) => sum + Number(o.totalPrice ?? 0), 0);
  }

  // -------------------------
  // UI helpers
  // -------------------------
  userName(order: Order): string {
    return String((order as any)?.user?.name ?? '').trim() || 'Unbekannter Nutzer';
  }

  statusLabel(order: Order): string {
    const s = String(order.status ?? '').toLowerCase();
    if (s === 'closed') return 'Abgeschlossen';
    if (s === 'open') return 'Offen';
    return String(order.status ?? '');
  }

  deliveryTimes(order: Order): string[] {
    const times = (order.items ?? [])
      .map((it: any) => this.prettyTime(it?.deliveryTime))
      .filter(Boolean);

    return Array.from(new Set(times));
  }

  prettyTime(value: any): string {
    const s = String(value ?? '').trim();
    if (!s) return '';

    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return s;

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return s;
  }

  dishKey(order: Order): string {
    const names = Array.from(
      new Set(
        (order.items ?? [])
          .map((it: any) => String(it?.menuItem?.name ?? ''))
          .filter(Boolean)
      )
    );
    if (!names.length) return 'Unbekannt';
    return names.length === 1 ? names[0] : 'Gemischt';
  }

  get groupedOrders(): { [key: string]: Order[] } {
    switch (this.activeGroup) {
      case 'Nach Gericht':
        return this.groupBy(o => this.dishKey(o));
      case 'Nach Lieferzeit':
        return this.groupBy(o => {
          const t = this.deliveryTimes(o);
          return t.length ? t.join(', ') : 'Unbekannt';
        });
      default:
        return { 'Alle Bestellungen': this.paginatedOrders };
    }
  }

  private groupBy(fn: (order: Order) => string): { [key: string]: Order[] } {
    return this.paginatedOrders.reduce((groups, order) => {
      const key = fn(order);
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
      return groups;
    }, {} as { [key: string]: Order[] });
  }

  toggleCompletedOrders(): void {
    this.completedCollapsed = !this.completedCollapsed;
  }

  goToScanner(): void {
    this.router.navigate(['/admin/balance-scan']);
  }

  navigateToUser(userId: string): void {
    this.router.navigate(['/user', userId]).catch(() => {
      this.router.navigate(['/user']);
    });
  }

  goToFinance(): void {
    this.router.navigate(['/statistics']);
  }
}
