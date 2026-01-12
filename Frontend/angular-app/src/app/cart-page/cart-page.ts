import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CartItemComponent } from '../cart-item/cart-item';
import { OrderItem } from '../../models/menu-item.model';
import { CartService } from '../services/cart/cart-service';
import { UserProfileService } from '../services/user-profile';

type CreateOrderPayload = {
  user: { id: string };
  items: Array<{
    menuItemId: string;
    quantity: number;
    note?: string;
    deliveryTime: string;
  }>;
  totalPrice: number;
  createdAt: string;
  status: 'open' | 'closed';
};

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CartItemComponent],
  templateUrl: './cart-page.html',
  styleUrls: ['./cart-page.css']
})
export class CartPageComponent implements OnInit {
  // ✅ needed by HTML
  showImpressumPopup = false;

  cartItems: OrderItem[] = [];

  deliveryTimeOptions: string[] = ['12:20', '13:10'];
  selectedTime = '';
  timeError = '';

  // ✅ Profil / Guthaben
  profileLoading = false;
  userId = '';
  balance = 0;
  reserved = 0;
  available = 0;

  // UI
  submitting = false;

  constructor(
    private router: Router,
    private cartService: CartService,
    private userProfile: UserProfileService
  ) {}

  ngOnInit(): void {
    this.cartItems = this.cartService.getCartItems();
    this.loadProfile();
  }

  // -------------------------
  // ✅ Profil + Guthaben laden
  // -------------------------
  loadProfile(): void {
    this.profileLoading = true;

    this.userProfile.getProfile().subscribe({
      next: (p) => {
        this.userId = String(p?.user?.id ?? '');
        this.balance = Number(p?.balance ?? 0);
        this.reserved = Number(p?.reserved ?? 0);
        this.available = Number(p?.available ?? (this.balance - this.reserved));
        this.profileLoading = false;
      },
      error: () => {
        // fallback, aber bestellbar sollte es dann nicht sein
        this.userId = '';
        this.balance = 0;
        this.reserved = 0;
        this.available = 0;
        this.profileLoading = false;
      }
    });
  }

  // -------------------------
  // Cart Actions
  // -------------------------
  increaseQuantity(index: number): void {
    this.cartItems = this.cartService.increaseQuantity(this.cartItems, index);
  }

  decreaseQuantity(index: number): void {
    this.cartItems = this.cartService.decreaseQuantity(this.cartItems, index);
  }

  updateNote(index: number, note: string): void {
    this.cartItems = this.cartService.updateNote(this.cartItems, index, note);
  }

  removeItem(index: number): void {
    this.cartItems = this.cartService.removeItem(this.cartItems, index);
  }

  // -------------------------
  // Impressum Popup
  // -------------------------
  openImpressum(): void {
    this.showImpressumPopup = true;
  }

  closeImpressum(): void {
    this.showImpressumPopup = false;
  }

  // -------------------------
  // Helpers
  // -------------------------
  money(n: any): string {
    const v = Number(n ?? 0);
    const fixed = Number.isFinite(v) ? v.toFixed(2) : '0.00';
    return fixed.replace('.', ',') + ' €';
  }

  private parseMoneyToNumber(value: any): number {
    if (typeof value === 'number') return value;

    const s = String(value ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace('€', '')
      .replace(',', '.');

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  getTotal(): number {
    return this.cartItems.reduce((sum, item) => {
      const price = this.parseMoneyToNumber(item.menuItem?.price);
      const qty = Number(item.quantity ?? 0);
      return sum + price * qty;
    }, 0);
  }

  private buildDeliveryTimeIso(hhmm: string): string {
    const [hh, mm] = hhmm.split(':').map(v => Number(v));
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }

  onOrder(): void {
    if (this.submitting) return;

    if (!this.userId) {
      this.timeError = 'User konnte nicht geladen werden (Profil fehlt). Bitte neu einloggen.';
      return;
    }

    if (this.cartItems.length === 0) {
      this.timeError = 'Dein Warenkorb ist leer.';
      return;
    }

    if (!this.cartService.isValidTimeFormat(this.selectedTime)) {
      this.timeError = 'Bitte wähle eine gültige Uhrzeit.';
      return;
    }

    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(11, 20, 0, 0);

    const weekday = now.getDay();
    if (weekday === 0 || weekday === 6) {
      this.timeError = 'Bestellungen sind nur von Montag bis Freitag möglich.';
      return;
    }

    if (now > cutoff) {
      this.timeError = 'Bestellungen können nur bis 11:20 Uhr am selben Tag aufgegeben werden.';
      return;
    }

    const deliveryTime = this.buildDeliveryTimeIso(this.selectedTime);
    const totalPrice = this.getTotal();

    if (totalPrice > this.available) {
      this.timeError = 'Nicht genug verfügbares Guthaben.';
      return;
    }

    this.timeError = '';

    const payload: CreateOrderPayload = {
      user: { id: this.userId },
      items: this.cartItems.map(item => ({
        menuItemId: String(item.menuItem.id),
        quantity: Number(item.quantity ?? 0),
        note: (item.note ?? '').toString(),
        deliveryTime
      })),
      totalPrice: Number(totalPrice),
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    this.submitting = true;

    this.cartService.submitOrder(payload).subscribe({
      next: () => {
        this.submitting = false;

        this.cartService.clearCart();
        this.cartItems = [];
        this.selectedTime = '';

        this.loadProfile();
        this.router.navigate(['/my-orders']);
      },
      error: (err) => {
        this.submitting = false;
        this.timeError = err?.error?.message || err?.message || String(err);
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/']);
  }
}
