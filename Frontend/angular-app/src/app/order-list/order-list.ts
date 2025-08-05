import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderItem } from '../../models/menu-item.model';
import { OrderService } from '../order-service';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrls: ['./order-list.css']
})
export class OrderListComponent implements OnInit {
  activeGroup: string = 'Keine Gruppierung';
  readonly groupOptions = ['Keine Gruppierung', 'Nach Gericht', 'Nach Lieferzeit'];

  orderItems: OrderItem[] = [];
  paginatedItems: OrderItem[] = [];
  currentPage = 1;
  itemsPerPage = 5;
  pages: number[] = [];

  constructor(private router: Router, private orderService: OrderService) {}

  ngOnInit(): void {
    this.orderService.getOrders().subscribe(items => {
      this.orderItems = items;
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
    const total = this.totalPages;
    this.pages = Array.from({ length: total }, (_, i) => i + 1);
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
    return Math.ceil(this.orderItems.length / this.itemsPerPage);
  }

  get totalSum(): number {
    return this.orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  get groupedOrders(): { [key: string]: OrderItem[] } {
    switch (this.activeGroup) {
      case 'Nach Gericht':
        return this.groupBy(item => `${item.menuItem.title}`);
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

  toggleDelivered(item: OrderItem): void {
    item.delivered = !item.delivered;
    this.orderService.toggleDelivered(item.menuItem.id, item.delivered).subscribe();
  }

  navigateToUser(userId: number): void {
    this.router.navigate(['/users', userId]);
  }
}
