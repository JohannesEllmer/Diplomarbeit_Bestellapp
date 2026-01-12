import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, timer, merge } from 'rxjs';
import { filter, takeUntil, finalize } from 'rxjs/operators';

import { MenuItem } from '../../models/menu-item.model';
import { MealPlan } from '../../models/meal-plan.model';

import { MenuItemComponent } from '../menu-item-component/menu-item-component';
import { MenuService } from '../services/menu/menu-service';
import { CartService } from '../services/cart/cart-service';
import { AuthService } from '../auth/auth.service';
import { MenuHeaderService } from '../app-menu/menu-header.service';

@Component({
  selector: 'app-menu-plan',
  standalone: true,
  imports: [CommonModule, MenuItemComponent, FormsModule],
  templateUrl: './menu-plan-component.html',
  styleUrls: ['./menu-plan-component.css'],
})
export class MenuPlanComponent implements OnInit, OnDestroy {
  showImpressumPopup = false;

  activeCategory = 'Alle';
  activeFilter = 'Alle';
  searchTerm = '';

  categories = ['Alle', 'Hauptgericht', 'Dessert', 'Getränk'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [];
  selectedMenuTitle = '';
  hasActiveMenu = false;

  loadingItems = false;
  statusMsg = '';

  private destroy$ = new Subject<void>();

  private lastFailAt = 0;
  private readonly failCooldownMs = 60_000;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private auth: AuthService,
    private headerService: MenuHeaderService,
  ) {}

  ngOnInit(): void {
    console.log('[MenuPlan] init');
    this.cartService.getCartItems();

    const timer$ = timer(0, 10 * 60 * 1000);

    const navToHome$ = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      filter(e => e.urlAfterRedirects === '/' || e.urlAfterRedirects.startsWith('/?'))
    );

    merge(timer$, navToHome$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchSelectedMenu());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchSelectedMenu(): void {
    if (!this.auth.isLoggedIn()) {
      console.warn('[MenuPlan] not logged in -> skipping menu fetch');
      return;
    }

    const now = Date.now();
    if (this.lastFailAt && now - this.lastFailAt < this.failCooldownMs) {
      return;
    }

    this.loadingItems = true;
    this.statusMsg = '';

    this.menuService.getSelectedMealPlan()
      .pipe(finalize(() => (this.loadingItems = false)))
      .subscribe({
        next: (plan: MealPlan | null) => {
          if (!plan) {
            this.selectedMenuTitle = '';
            this.menuItems = [];
            this.hasActiveMenu = false;
            this.statusMsg = 'Kein aktives Menü verfügbar.';
            return;
          }

          this.selectedMenuTitle = (plan as any).title ?? '';

          const dishes = (plan as any).dishes ?? [];
          const items = Array.isArray(dishes) ? dishes : [];

          // ✅ HIER liegt der Fix:
          // available default TRUE, falls Feld fehlt
          this.menuItems = items.map((d: any) => ({
            id: String(d.id),
            name: d.name ?? '',
            description: d.description ?? '',
            price: Number(d.price ?? 0),
            category: (d.category ?? 'Hauptgericht'),
            vegetarian: !!d.vegetarian,
            available: d.available !== false,
            allergens: Array.isArray(d.allergens) ? d.allergens : (Array.isArray(d.allergenes) ? d.allergenes : []),
          })) as MenuItem[];

          this.hasActiveMenu = true;
          console.log('[MenuPlan] selected menu items:', this.menuItems.length);
        },
        error: (err) => {
          console.error('[MenuPlan] selected menu error:', err);
          this.lastFailAt = Date.now();
          this.selectedMenuTitle = '';
          this.menuItems = [];
          this.hasActiveMenu = false;
          this.statusMsg = 'Fehler beim Laden des aktiven Menüs.';
        },
      });
  }

  get balance(): number {
    const tokenUser = this.auth.getCurrentUser();
    const n = Number(tokenUser?.balance ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  formatBalance(): string {
    const n = Number(this.balance ?? 0);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  get filteredItems(): MenuItem[] {
    return (this.menuItems ?? []).filter(i => this.matches(i));
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

  private searchTimer?: any;
  onSearchChange(value: string): void {
    const v = (value ?? '').toString();
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => (this.searchTerm = v), 200);
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  get totalCost(): number {
    return this.cartService.getTotal(this.cartService.getCartItems());
  }

  addToOrder(menuItem: MenuItem, note = '', deliveryTime = '12:00'): void {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    // optional: blocken, wenn nicht verfügbar
    if (menuItem.available === false) return;

    const items = this.cartService.getCartItems();
    const existing = items.find(
      (i: any) => i.menuItem.id === menuItem.id && i.note === note && i.deliveryTime === deliveryTime
    );

    if (existing) existing.quantity += 1;
    else items.push({ menuItem, user, note, quantity: 1, delivered: false, deliveryTime });

    this.cartService.saveCartItems(items);
  }

  navigateToCart(): void {
    this.router.navigate(['/warenkorb']);
  }

  get cartItemCount(): number {
    return this.cartService.getItemCount(this.cartService.getCartItems());
  }
}
