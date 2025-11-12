import { Injectable } from '@angular/core';
import { MenuItem, OrderItem, User } from '../../../models/menu-item.model';


@Injectable({ providedIn: 'root' })
export class MenuItemService {
  addToOrder(orderItems: OrderItem[], menuItem: MenuItem, user: User, note: string = '', deliveryTime: string = '12:00'): OrderItem[] {
    const existing = orderItems.find(
      item => item.menuItem.id === menuItem.id && item.note === note && item.deliveryTime === deliveryTime
    );
    if (existing) {
      existing.quantity += 1;
    } else {
      orderItems.push({
        menuItem,
        user,
        note,
        quantity: 1,
        delivered: false,
        deliveryTime
      });
    }
    return orderItems;
    }

  removeFromOrder(orderItems: OrderItem[], menuItem: MenuItem, note: string = '', deliveryTime: string = '12:00'): OrderItem[] {
    const index = orderItems.findIndex(
      item => item.menuItem.id === menuItem.id && item.note === note && item.deliveryTime === deliveryTime
    );
    if (index !== -1) orderItems.splice(index, 1);
    return orderItems;
  }

  updateNote(orderItems: OrderItem[], menuItem: MenuItem, oldNote: string, newNote: string): OrderItem[] {
    const item = orderItems.find(i => i.menuItem.id === menuItem.id && i.note === oldNote);
    if (item) item.note = newNote;
    return orderItems;
  }

  changeQuantity(orderItems: OrderItem[], menuItem: MenuItem, note: string, deliveryTime: string, delta: number): OrderItem[] {
    const item = orderItems.find(i => i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime);
    if (item) item.quantity = Math.max(1, item.quantity + delta);
    return orderItems;
  }

  getTotalCost(orderItems: OrderItem[]): number {
    return orderItems.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  }

  getItemCount(orderItems: OrderItem[]): number {
    return orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }
}
