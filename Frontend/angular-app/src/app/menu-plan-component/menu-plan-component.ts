import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MenuItem } from '../../models/menu-item.model';
import { Menu } from '../../models/menu.model';

import { MenuItemComponent } from '../menu-item-component/menu-item-component';
import { MenuService } from '../services/menu/menu-service';
import { CartService } from '../services/cart/cart-service';
import { AuthService } from '../auth/auth.service';              // ✅ user aus auth
import { MenuHeaderService } from '../app-menu/menu-header.service'; // ✅ balance/header

@Component({
  selector: 'app-menu-plan',
  standalone: true,
  imports: [CommonModule, MenuItemComponent, FormsModule],
  templateUrl: './menu-plan-component.html',
  styleUrls: ['./menu-plan-component.css'],
})
export class MenuPlanComponent implements OnInit {
  showImpressumPopup = false;

  activeCategory = 'Alle';
  activeFilter = 'Alle';
  searchTerm = '';

  // Kategorien sollten zu deiner DB passen:
  categories = ['Alle', 'Hauptgericht', 'Dessert', 'Getränk'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [];
  menus: Menu[] = [];

  loadingItems = false;
  loadingMenus = false;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private auth: AuthService,
    private headerService: MenuHeaderService,
  ) {}

  ngOnInit(): void {
    console.log('[MenuPlan] init');

    // nur laden, wenn eingeloggt (falls deine endpoints geschützt sind)
    // wenn sie öffentlich sein sollen, kannst du das if entfernen
    if (!this.auth.isLoggedIn()) {
      console.warn('[MenuPlan] not logged in -> skipping menu fetch');
      return;
    }

    this.loadingItems = true;
    this.menuService.getMenuItems().subscribe(items => {
      this.menuItems = items ?? [];
      this.loadingItems = false;
    });

    this.loadingMenus = true;
    this.menuService.getMenus().subscribe(ms => {
      this.menus = ms ?? [];
      this.loadingMenus = false;
    });

    // Warenkorb laden
    this.cartService.getCartItems();
  }

  // Balance kommt aus Header (oder 0)
  get balance(): number {
    const h = (this.headerService as any).header$ ? null : null; // nur damit TS nicht meckert, falls du header$ anders hast
    const tokenUser = this.auth.getCurrentUser();
    const n = Number(tokenUser?.balance ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  get filteredItems(): MenuItem[] {
    return (this.menuItems ?? []).filter(i => this.matches(i));
  }

  // Menüs: entweder dish schon geladen oder du brauchst mapping (wenn nur dishMenuItemId kommt)
  get filteredMenus(): Menu[] {
    return (this.menus ?? []).filter(m => {
      const dish = m.dish;
      return dish ? this.matches(dish) : true; // wenn dish fehlt: nicht rausfiltern
    });
  }

  private matches(item: MenuItem): boolean {
    if (!item) return false;

    const term = this.searchTerm?.trim().toLowerCase();
    const searchMatch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      (item.description ?? '').toLowerCase().includes(term);

    const category = (item.category ?? '').trim();
    const categoryMatch = this.activeCategory === 'Alle' ? true : category === this.activeCategory;

    const filterMatch = this.activeFilter !== 'Vegetarisch' || !!item.vegetarian;

    return searchMatch && categoryMatch && filterMatch;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  private searchTimer?: any;

onSearchChange(value: string): void {
  const v = (value ?? '').toString();
  clearTimeout(this.searchTimer);
  this.searchTimer = setTimeout(() => {
    this.searchTerm = v;
  }, 200);
}
// ✅ Guthaben sauber formatieren (keine Crashes)
formatBalance(): string {
  const n = Number(this.balance ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

// ✅ totalCost bleibt Getter (du hast ihn schon)
get totalCost(): number {
  return this.cartService.getTotal(this.cartService.getCartItems());
}



  addToOrder(menuItem: MenuItem, note = '', deliveryTime = '12:00'): void {
    // ✅ user aus Auth (nicht hardcoded!)
    const user = this.auth.getCurrentUser();
    if (!user) return;

    const items = this.cartService.getCartItems();
    const existing = items.find(
      (i: any) => i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime
    );

    if (existing) existing.quantity += 1;
    else {
      items.push({
        menuItem,
        user,
        note,
        quantity: 1,
        delivered: false,
        deliveryTime,
      });
    }

    this.cartService.saveCartItems(items);
  }

  navigateToCart(): void {
    this.router.navigate(['/warenkorb']);
  }

  get cartItemCount(): number {
    return this.cartService.getItemCount(this.cartService.getCartItems());
  }
}
