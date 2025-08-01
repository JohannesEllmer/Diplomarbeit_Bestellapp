import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderItem, MenuItem } from '../../models/menu-item.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrls: ['./order-list.css']
})
export class OrderListComponent {
  activeGroup: string = 'Keine Gruppierung';

  readonly groupOptions = ['Keine Gruppierung', 'Nach Gericht', 'Nach Lieferzeit'];

  orderItems: OrderItem[] = [
    {
      menuItem: {
        id: 1,
        title: 'Kürbiscremesuppe',
        description: '',
        price: 4.90,
        category: 'Vorspeisen',
        available: true,
        vegetarian: true,
        allergens: [],
        imageUrl: ''
      },
      user: {
        id: 101,
        name: 'Anna Müller',
        email: 'anna@example.com',
        class: '3A',
        orderCount: 5,
        balance: 10.00,
        blocked: false
      },
      note: 'Ohne Ingwer',
      quantity: 2,
      delivered: false,
      deliveryTime: '12:30'
    },
    {
      menuItem: {
        id: 2,
        title: 'Wiener Schnitzel',
        description: '',
        price: 12.50,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: false,
        allergens: [],
        imageUrl: ''
      },
      user: {
        id: 102,
        name: 'Max Mustermann',
        email: 'max@example.com',
        class: '4B',
        orderCount: 3,
        balance: 5.00,
        blocked: false
      },
      note: '',
      quantity: 1,
      delivered: true,
      deliveryTime: '13:00'
    }
  ];

  constructor(private router: Router) {}

  get totalSum(): number {
    return this.orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

get groupedOrders(): { [key: string]: OrderItem[] } {
  switch (this.activeGroup) {
    case 'Nach Gericht':
      return this.groupBy(item => item.menuItem.title);
    case 'Nach Lieferzeit':
      return this.groupBy(item => item.deliveryTime || 'Unbekannt');
    default:
      return { 'Alle Bestellungen': this.orderItems };
  }
}


  groupBy(fn: (item: OrderItem) => string): { [key: string]: OrderItem[] } {
    return this.orderItems.reduce((groups, item) => {
      const key = fn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: OrderItem[] });
  }

  toggleDelivered(item: OrderItem): void {
    item.delivered = !item.delivered;
  }

  navigateToUser(userId: number): void {
    this.router.navigate(['/user', userId]);
  }
}
