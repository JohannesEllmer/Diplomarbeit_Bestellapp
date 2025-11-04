import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuItem, OrderItem } from '../../models/menu-item.model';
import { User } from '../../models/user.model';
import { MenuItemComponent } from '../menu-item-component/menu-item-component';
import { MenuService } from '../services/menu/menu-service';
import { CartService } from '../services/cart/cart-service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-menu-plan',
  standalone: true,
  imports: [CommonModule, MenuItemComponent, HttpClientModule, FormsModule],
  templateUrl: './menu-plan-component.html',
  styleUrls: ['./menu-plan-component.css']
})
export class MenuPlanComponent implements OnInit {
  activeCategory: string = 'Alle';
  activeFilter: string = 'Alle';
  balance: number = 14.00;
  searchTerm: string = '';

  categories = ['Alle', 'Hauptgerichte', 'Süßes', 'Getränke'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [];
  orderItems: OrderItem[] = [];

  currentUser: User = {
    id: 999,
    name: 'Ellmer Johannes',
    email: 'ellmer@example.com',
    class: '5C',
    orderCount: 0,
    balance: 14.00,
    blocked: false
  };

  constructor(
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.menuService.getMenuItems().subscribe(items => {
      this.menuItems = items;
    });
  }

  get filteredItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      // Suchfilter
      const searchMatch = !this.searchTerm ||
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Kategorienfilter
      const isDrink = item.category === 'Getränke';
      const categoryMatch =
        this.activeCategory === 'Alle'
          ? !isDrink
          : item.category === this.activeCategory;

      // Vegetarisch-Filter
      const filterMatch = this.activeFilter !== 'Vegetarisch' || item.vegetarian;

      return searchMatch && categoryMatch && filterMatch;
    });
  }

  // Wird bei jeder Eingabeänderung im Suchfeld aufgerufen
  onSearchChange(): void {
    // Die filteredItems-Property wird automatisch aktualisiert
  }

  // Löscht die Suche
  clearSearch(): void {
    this.searchTerm = '';
  }

  addToOrder(menuItem: MenuItem, note: string = '', deliveryTime: string = '12:00'): void {
    const existing = this.orderItems.find(
      item => item.menuItem.id === menuItem.id && item.note === note && item.deliveryTime === deliveryTime
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      this.orderItems.push({
        menuItem,
        user: this.currentUser,
        note,
        quantity: 1,
        delivered: false,
        deliveryTime
      });
    }
  }

  removeFromOrder(menuItem: MenuItem, note: string = '', deliveryTime: string = '12:00'): void {
    const index = this.orderItems.findIndex(
      item => item.menuItem.id === menuItem.id && item.note === note && item.deliveryTime === deliveryTime
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

  changeQuantity(menuItem: MenuItem, note: string, deliveryTime: string, delta: number): void {
    const item = this.orderItems.find(
      i => i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime
    );
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
    }
  }

  get cartItemCount(): number {
    return this.cartService.getItemCount(this.orderItems);
  }

  get totalCost(): number {
    return this.cartService.getTotal(this.orderItems);
  }

  navigateToCart(): void {
    this.cartService.saveCartItems(this.orderItems);
    this.router.navigate(['/warenkorb']);
  }
}
