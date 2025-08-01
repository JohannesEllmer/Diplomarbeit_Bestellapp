import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem, OrderItem } from '../../models/menu-item.model';
import { MenuItemComponent } from '../menu-item-component/menu-item-component';

@Component({
  selector: 'app-menu-plan',
  standalone: true,
  imports: [CommonModule, MenuItemComponent],
  templateUrl: './menu-plan-component.html',
  styleUrls: ['./menu-plan-component.css']
})
export class MenuPlanComponent {
  activeCategory: string = 'Alle';
  activeFilter: string = 'Alle';
  balance: number = 14.00;

  readonly categories = ['Alle', 'Vorspeisen', 'Hauptgerichte', 'Desserts', 'Getränke'];
  readonly filters = ['Alle', 'Vegetarisch'];

  readonly menuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Kürbiscremesuppe',
      description: 'Cremige Suppe mit Kürbis und Ingwer',
      price: 4.90,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: ['G', 'L'],
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600'
    },
    {
      id: 2,
      title: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600'
    },
     {
      id: 3,
      title: 'Kalbs Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600'
    },
     {
      id: 4,
      title: 'Cola',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 3.50,
      category: 'Getränke',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600'
    }
  ];

  orderItems: (OrderItem & { quantity: number })[] = [];

  constructor(private router: Router) {}

  get filteredItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      const categoryMatch = this.activeCategory === 'Alle' || item.category === this.activeCategory;
      const filterMatch = this.activeFilter !== 'Vegetarisch' || item.vegetarian;
      return categoryMatch && filterMatch;
    });
  }

  addToOrder(menuItem: MenuItem, note: string = ''): void {
    const existing = this.orderItems.find(
      item => item.menuItem.id === menuItem.id && item.note === note
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      this.orderItems.push({ menuItem, note, quantity: 1 });
    }
  }

  removeFromOrder(menuItem: MenuItem, note: string = ''): void {
    const index = this.orderItems.findIndex(
      item => item.menuItem.id === menuItem.id && item.note === note
    );

    if (index !== -1) {
      this.orderItems.splice(index, 1);
    }
  }

  updateNote(menuItem: MenuItem, oldNote: string, newNote: string): void {
    const item = this.orderItems.find(
      i => i.menuItem.id === menuItem.id && i.note === oldNote
    );
    if (item) {
      item.note = newNote;
    }
  }

  changeQuantity(menuItem: MenuItem, note: string, delta: number): void {
    const item = this.orderItems.find(
      i => i.menuItem.id === menuItem.id && i.note === note
    );
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
    }
  }

  get cartItemCount(): number {
    return this.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalCost(): number {
    return this.orderItems.reduce((total, item) => {
      return total + item.menuItem.price * item.quantity;
    }, 0);
  }

  navigateToCart(): void {
    localStorage.setItem('cartItems', JSON.stringify(this.orderItems));
    this.router.navigate(['/warenkorb']);
  }
}
