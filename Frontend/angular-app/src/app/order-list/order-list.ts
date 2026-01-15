import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderItem } from '../../models/menu-item.model';
import { AdminOrderService } from '../services/order/admin-order.service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrls: ['./order-list.css']
})
export class OrderListComponent implements OnInit, OnDestroy {
  activeGroup: string = 'Keine Gruppierung';
  readonly groupOptions = ['Keine Gruppierung', 'Nach Gericht', 'Nach Lieferzeit'];

  orderItems: OrderItem[] = [];
  paginatedItems: OrderItem[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  pages: number[] = [];
  completedItems: OrderItem[] = [];
  completedCollapsed = true;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private adminOrders: AdminOrderService
  ) {}

  ngOnInit(): void {
    this.loadOrders();

    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadOrders());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.adminOrders.getOrdersFlatItems().subscribe(items => {
      const all = items ?? [];
      this.orderItems = all.filter(i => !i.delivered);
      this.completedItems = all.filter(i => i.delivered);

      this.currentPage = 1;
      this.updatePagination();
    });
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedItems = this.orderItems.slice(start, end);
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
    return this.orderItems.length === 0
      ? 1
      : Math.ceil(this.orderItems.length / this.itemsPerPage);
  }

  get totalSum(): number {
    return this.orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  get groupedOrders(): { [key: string]: OrderItem[] } {
    switch (this.activeGroup) {
      case 'Nach Gericht':
        return this.groupBy(item => `${item.menuItem.name}`);
      case 'Nach Lieferzeit':
        return this.groupBy(item => item.deliveryTime || 'Unbekannt');
      default:
        return { 'Alle Bestellungen': this.paginatedItems };
    }
  }

  groupBy(fn: (item: OrderItem) => string): { [key: string]: OrderItem[] } {
    return this.paginatedItems.reduce((groups, item) => {
      const key = fn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: OrderItem[] });
  }

  toggleCompletedOrders(): void {
    this.completedCollapsed = !this.completedCollapsed;
  }

  goToScanner(): void {
    // ggf. an deine echte Route anpassen:
    // z.B. '/admin/balance-scan' oder '/admin/balance'
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
