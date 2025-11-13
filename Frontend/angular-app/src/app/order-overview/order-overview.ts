import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Order } from '../../models/menu-item.model';
import { OrderService } from '../services/order-overview/order-overview.service';

@Component({
  selector: 'app-order-overview',
  templateUrl: './order-overview.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./order-overview.css']
})
export class OrderOverviewComponent implements OnInit {
  private router = inject(Router);
  private orderService = inject(OrderService);

  showImpressumPopup = false;

  orders: Order[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.loadMyOrders();
  }

  private loadMyOrders(): void {
    this.loading = true;
    this.error = null;

    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        // QR-URL nur für offene
        this.orders = this.orderService.addQrForOpenOrders(
          orders.map(o => ({
            ...o,
            totalPrice: o.totalPrice ?? (o.items ?? []).reduce((sum, it) => sum + it.menuItem.price * it.quantity, 0)
          }))
        );
        this.loading = false;
      },
      error: () => {
        this.error = 'Bestellungen konnten nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  toggleDetails(order: Order) {
    (order as any).showDetails = !(order as any).showDetails;
  }

  get openOrders(): Order[] {
    return (this.orders ?? []).filter(o => o.status === 'open');
  }

  get closedOrders(): Order[] {
    return (this.orders ?? []).filter(o => o.status === 'closed');
  }

  navigateBack(): void {
    this.router.navigate(['/']);
  }
}
