import { Component } from '@angular/core';
import { Order } from '../../models/menu-item.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-overview',
  templateUrl: './order-overview.html',
  imports: [CommonModule],
  standalone: true,
  styleUrls: ['./order-overview.css']
})
export class OrderOverviewComponent {
  orders: Order[] = [
    {
      id: 1,
      user: { id: 1, name: "Max Mustermann", email: "max@test.at", class: "3A", orderCount: 2, balance: 30, blocked: false },
      items: [],
      totalPrice: 24.5,
      createdAt: new Date(),
      status: "open",
    },
    {
      id: 2,
      user: { id: 1, name: "Max Mustermann", email: "max@test.at", class: "3A", orderCount: 2, balance: 30, blocked: false },
      items: [],
      totalPrice: 15.0,
      createdAt: new Date(),
      status: "closed",
    }
  ];

  toggleDetails(order: Order) {
    order.showDetails = !order.showDetails;
  }

  get openOrders() {
    return this.orders.filter(o => o.status === 'open');
  }

  get closedOrders() {
    return this.orders.filter(o => o.status === 'closed');
  }
}
