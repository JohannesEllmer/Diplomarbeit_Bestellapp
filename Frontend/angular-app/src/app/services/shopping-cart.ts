import { Injectable } from '@angular/core';
import { OrderItem } from '../../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class ShoppingCartService {
  private selectedItems: OrderItem[] = [];

  getItems(): OrderItem[] {
    const stored = localStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  }

  setItems(items: OrderItem[]): void {
    this.selectedItems = [...items];
    localStorage.setItem('cart', JSON.stringify(this.selectedItems));
  }

  addItem(item: OrderItem): void {
    this.selectedItems.push({...item});
    localStorage.setItem('cart', JSON.stringify(this.selectedItems));
  }

  removeItem(index: number): void {
    this.selectedItems.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(this.selectedItems));
  }

  updateNote(index: number, note: string): void {
    if (index >= 0 && index < this.selectedItems.length) {
      this.selectedItems[index].note = note;
      localStorage.setItem('cart', JSON.stringify(this.selectedItems));
    }
  }

  clearCart(): void {
    this.selectedItems = [];
    localStorage.removeItem('cart');
  }

  getTotal(): number {
    return this.getItems().reduce((sum, item) => sum + item.menuItem.price, 0);
  }
}
