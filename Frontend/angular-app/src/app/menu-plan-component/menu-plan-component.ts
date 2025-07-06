import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  
  categories = ['Alle', 'Vorspeisen', 'Hauptgerichte', 'Desserts', 'Getränke'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [
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
      title: 'Tiramisu',
      description: 'Klassisches italienisches Dessert',
      price: 5.20,
      category: 'Desserts',
      available: false,
      vegetarian: true,
      allergens: ['G', 'E', 'M'],
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600'
    }
  ];

  selectedItems: OrderItem[] = [];

  get filteredItems(): MenuItem[] {
    let items = this.menuItems;
    
    if (this.activeCategory !== 'Alle') {
      items = items.filter(item => item.category === this.activeCategory);
    }
    
    if (this.activeFilter === 'Vegetarisch') {
      items = items.filter(item => item.vegetarian);
    }
    
    return items;
  }

  addToOrder(orderItem: OrderItem): void {
    this.selectedItems.push(orderItem);
  }

  removeItem(index: number): void {
    this.selectedItems.splice(index, 1);
  }

  checkout(): void {
    alert(`Bestellung abgeschlossen!\nGesamtbetrag: €${this.totalCost.toFixed(2)}`);
    this.selectedItems = [];
  }

  get totalCost(): number {
    return this.selectedItems.reduce((sum, item) => sum + item.menuItem.price, 0);
  }
}