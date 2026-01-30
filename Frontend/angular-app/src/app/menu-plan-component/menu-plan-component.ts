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

  // ✅ plus Filter "Menü" (für Set/Menü-Gerichte)
  categories = ['Alle', 'Menü', 'Hauptgericht', 'Dessert', 'Getränk'];
  filters = ['Alle', 'Vegetarisch'];

  menuItems: MenuItem[] = [];
  selectedMenuTitle = '';
  hasActiveMenu = false;

  selectedMenu: MealPlan | null = null;

  loadingItems = false;
  statusMsg = '';

  private destroy$ = new Subject<void>();
  private lastFailAt = 0;
  private readonly failCooldownMs = 60_000;
  private searchTimer?: any;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private auth: AuthService,
    private headerService: MenuHeaderService,
  ) {}

  ngOnInit(): void {
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
    if (!this.auth.isLoggedIn()) return;

    const now = Date.now();
    if (this.lastFailAt && now - this.lastFailAt < this.failCooldownMs) return;

    this.loadingItems = true;
    this.statusMsg = '';

    this.menuService.getSelectedMealPlan()
      .pipe(finalize(() => (this.loadingItems = false)))
      .subscribe({
        next: (plan: MealPlan | null) => {
          if (!plan) {
            this.selectedMenu = null;
            this.selectedMenuTitle = '';
            this.menuItems = [];
            this.hasActiveMenu = false;
            this.statusMsg = 'Kein aktives Menü verfügbar.';
            return;
          }

          this.selectedMenu = plan;
          this.selectedMenuTitle = plan.title ?? '';
          this.hasActiveMenu = true;

          // ✅ WICHTIG: aktive Menü-ID im Cart merken
          const menuId = String((plan as any)?.id ?? '').trim();
          if (menuId) this.cartService.setCartMenuId(menuId);

          const menuDrink = String((plan as any)?.drink ?? '').trim();
          const menuDessert = String((plan as any)?.dessert ?? '').trim();

          const raw = (plan as any).menuItems ?? [];
          const items = Array.isArray(raw) ? raw : [];

          // ✅ Keine Model-Änderung nötig: wir füllen nur die vorhandenen Felder
          this.menuItems = items.map((m: any): MenuItem => ({
            id: String(m.id),
            name: m.name ?? '',
            description: m.description ?? '',
            price: Number(m.price ?? 0),
            category: (m.category ?? ''),
            vegetarian: !!m.vegetarian,
            available: m.available !== false,
            allergens: Array.isArray(m.allergens) ? m.allergens : [],
            // optional: falls vorhanden, hilft für "Menü"-Badge
            drink: menuDrink || m.drink || undefined,
            dessert: menuDessert || m.dessert || undefined,
          }));
        },
        error: (err) => {
          console.error('[MenuPlan] selected menu error:', err);
          this.lastFailAt = Date.now();
          this.selectedMenu = null;
          this.selectedMenuTitle = '';
          this.menuItems = [];
          this.hasActiveMenu = false;
          this.statusMsg = 'Fehler beim Laden des aktiven Menüs.';
        },
      });
  }

  get menuDrink(): string {
    return String((this.selectedMenu as any)?.drink ?? '').trim();
  }

  get menuDessert(): string {
    return String((this.selectedMenu as any)?.dessert ?? '').trim();
  }

  private buildMenuHint(): string {
    if (!this.selectedMenu) return '';
    const title = String(this.selectedMenu.title ?? '').trim();
    const drink = this.menuDrink;
    const dessert = this.menuDessert;

    const parts: string[] = [];
    if (title) parts.push(`Menü: ${title}`);
    if (drink) parts.push(`Getränk: ${drink}`);
    if (dessert) parts.push(`Dessert: ${dessert}`);

    return parts.length ? ` [${parts.join(', ')}]` : '';
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
    const isMenuLike = !!(String((item as any)?.drink ?? '').trim() || String((item as any)?.dessert ?? '').trim());

    let categoryMatch = true;
    if (this.activeCategory === 'Alle') categoryMatch = true;
    else if (this.activeCategory === 'Menü') categoryMatch = isMenuLike;
    else categoryMatch = category === this.activeCategory;

    const filterMatch = this.activeFilter !== 'Vegetarisch' || !!item.vegetarian;

    return searchMatch && categoryMatch && filterMatch;
  }

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
    if (menuItem.available === false) return;

    // ✅ sicherstellen, dass Menü-ID gesetzt ist (falls fetch timing)
    const menuId = String((this.selectedMenu as any)?.id ?? '').trim();
    if (menuId) this.cartService.setCartMenuId(menuId);

    const trimmed = String(note ?? '').trim();
    const finalNote = (trimmed + this.buildMenuHint()).trim();

    const items = this.cartService.getCartItems();
    const existing = items.find(
      (i: any) =>
        String(i?.menuItem?.id) === String(menuItem.id) &&
        String(i.note ?? '') === finalNote &&
        String(i.deliveryTime ?? '') === String(deliveryTime ?? '')
    );

    if (existing) existing.quantity += 1;
    else items.push({ menuItem, user, note: finalNote, quantity: 1, delivered: false, deliveryTime });

    this.cartService.saveCartItems(items);
  }

  navigateToCart(): void {
    this.router.navigate(['/warenkorb']);
  }

  get cartItemCount(): number {
    return this.cartService.getItemCount(this.cartService.getCartItems());
  }
}
