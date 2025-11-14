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
        // QR-URL 
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

  getOrderTitle(order: Order): string {
    if (!order.items || order.items.length === 0) {
      return 'Leere Bestellung';
    }

    const parts = order.items.map(item =>
      `${item.quantity}× ${item.menuItem.name}`
    );

    if (parts.length === 1) return parts[0];

    const [first, second, ...rest] = parts;
    if (parts.length === 2) return `${first}, ${second}`;

    return `${first}, ${second} (+${rest.length} weitere)`;
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
