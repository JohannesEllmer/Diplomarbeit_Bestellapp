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
  showImpressumPopup = false;
  activeCategory: string = 'Alle';
  activeFilter: string = 'Alle';
  balance: number = 14.00;
  searchTerm: string = '';

  categories = ['Alle', 'Hauptgerichte', 'Süßes', 'Getränke'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [];

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

    
  
    this.cartService.getCartItems();
  }

  // Filterfunktion für Menü-Items
  get filteredItems(): MenuItem[] {
    return this.menuItems.filter(item => {
      const searchMatch = !this.searchTerm || item.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const isDrink = item.category === 'Getränke';
      const categoryMatch = this.activeCategory === 'Alle' ? !isDrink : item.category === this.activeCategory;
      const filterMatch = this.activeFilter !== 'Vegetarisch' || item.vegetarian;
      return searchMatch && categoryMatch && filterMatch;
    });
  }

  onSearchChange(): void {
    // filteredItems aktualisieren sich automatisch
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  // Item in den Warenkorb legen
  addToOrder(menuItem: MenuItem, note: string = '', deliveryTime: string = '12:00'): void {
    let items = this.cartService.getCartItems();
    const existing = items.find(
      item => item.menuItem.id === menuItem.id && item.note === note && item.deliveryTime === deliveryTime
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        menuItem,
        user: this.currentUser,
        note,
        quantity: 1,
        delivered: false,
        deliveryTime
      });
    }

    this.cartService.saveCartItems(items);
  }

  removeFromOrder(menuItem: MenuItem, note: string = '', deliveryTime: string = '12:00'): void {
    let items = this.cartService.getCartItems();
    items = items.filter(i => !(i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime));
    this.cartService.saveCartItems(items);
  }

  changeQuantity(menuItem: MenuItem, note: string, deliveryTime: string, delta: number): void {
    let items = this.cartService.getCartItems();
    const item = items.find(
      i => i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime
    );
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
      this.cartService.saveCartItems(items);
    }
  }

  updateNote(menuItem: MenuItem, oldNote: string, newNote: string): void {
    let items = this.cartService.getCartItems();
    const item = items.find(i => i.menuItem.id === menuItem.id && i.note === oldNote);
    if (item) {
      item.note = newNote;
      this.cartService.saveCartItems(items);
    }
  }

  get cartItemCount(): number {
    return this.cartService.getItemCount(this.cartService.getCartItems());
  }

  get totalCost(): number {
    return this.cartService.getTotal(this.cartService.getCartItems());
  }

  navigateToCart(): void {
    this.router.navigate(['/warenkorb']);
  }
}
