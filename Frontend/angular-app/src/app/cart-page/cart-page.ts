import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CartItemComponent } from '../cart-item/cart-item';
import { OrderItem } from '../../models/menu-item.model';
import { CartService } from '../services/cart/cart-service';
import { UserProfileService } from '../services/user-profile';
import { SiteFooterComponent } from '../site-footer/footer';

type CreateOrderItemDto = {
  menuItemId: string;
  quantity: number;
  note?: string;
  deliveryTime?: string; // ISO
};

type CreateOrderDto = {
  items: CreateOrderItemDto[];
};

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CartItemComponent, SiteFooterComponent],
  templateUrl: './cart-page.html',
  styleUrls: ['./cart-page.css']
})
export class CartPageComponent implements OnInit {
  showImpressumPopup = false;

  cartItems: OrderItem[] = [];

  deliveryTimeOptions: string[] = ['12:20', '13:10'];
  selectedTime = '';
  timeError = '';

  profileLoading = false;
  userId = '';
  balance = 0;
  reserved = 0;
  available = 0;

  submitting = false;

  // ✅ NEW: Ordering enabled (default true)
  orderingEnabled = true;

  // ✅ optional UI Hint
  infoMsg = '';

  constructor(
    private router: Router,
    private cartService: CartService,
    private userProfile: UserProfileService
  ) {}

  ngOnInit(): void {
    // ✅ 1) Cart zuerst laden
    this.cartItems = this.cartService.getCartItems();

    // ✅ 2) Dann sofort validieren (Menüwechsel/availability)
    this.cartService.validateCartAgainstActiveMenu().subscribe(res => {
      this.cartItems = this.cartService.getCartItems();

      if (res.clearedBecauseMenuChanged) {
        this.infoMsg = 'Menü wurde gewechselt – dein Warenkorb wurde zurückgesetzt.';
      } else if (res.removedItemsCount > 0) {
        this.infoMsg = `${res.removedItemsCount} Artikel waren nicht mehr verfügbar und wurden entfernt.`;
      } else {
        this.infoMsg = '';
      }
    });

    this.loadProfile();
  }

  // ✅ NEW: zentrale “Button darf klicken?” Logik
  get canOrder(): boolean {
    return (
      this.orderingEnabled &&
      !this.submitting &&
      !this.profileLoading &&
      this.cartItems.length > 0
    );
  }

  loadProfile(): void {
    this.profileLoading = true;

    this.userProfile.getProfile().subscribe({
      next: (p) => {
        this.userId = String(p?.user?.id ?? '');
        this.balance = Number(p?.balance ?? 0);
        this.reserved = Number(p?.reserved ?? 0);
        this.available = Number(p?.available ?? (this.balance - this.reserved));

        // ✅ NEW: orderingEnabled aus Profile/Settings lesen (falls vorhanden)
        const oe =
          (p as any)?.orderingEnabled ??
          (p as any)?.settings?.orderingEnabled ??
          (p as any)?.settings?.ordering_enabled ??
          undefined;

        if (typeof oe === 'boolean') {
          this.orderingEnabled = oe;
        } else {
          // fallback: nichts ändern (default true)
          this.orderingEnabled = true;
        }

        this.profileLoading = false;

        if (!this.orderingEnabled) {
          this.infoMsg = 'Bestellungen sind aktuell deaktiviert.';
        }
      },
      error: () => {
        this.userId = '';
        this.balance = 0;
        this.reserved = 0;
        this.available = 0;

        // wenn Profil nicht ladbar → bestellbar lieber false
        this.orderingEnabled = false;

        this.profileLoading = false;
      }
    });
  }

  increaseQuantity(index: number): void {
    this.cartItems = this.cartService.increaseQuantity(this.cartItems as any, index) as any;
  }

  decreaseQuantity(index: number): void {
    this.cartItems = this.cartService.decreaseQuantity(this.cartItems as any, index) as any;
  }

  updateNote(index: number, note: string): void {
    this.cartItems = this.cartService.updateNote(this.cartItems as any, index, note) as any;
  }

  removeItem(index: number): void {
    this.cartItems = this.cartService.removeItem(this.cartItems as any, index) as any;
  }

  openImpressum(): void {
    this.showImpressumPopup = true;
  }

  closeImpressum(): void {
    this.showImpressumPopup = false;
  }

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
      const price = this.parseMoneyToNumber((item as any)?.menuItem?.price);
      const qty = Number((item as any)?.quantity ?? 0);
      return sum + price * qty;
    }, 0);
  }

  private buildDeliveryTimeIso(hhmm: string): string | undefined {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm ?? '').trim());
    if (!m) return undefined;

    const hh = Number(m[1]);
    const mm = Number(m[2]);

    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }

  onOrder(): void {
    if (this.submitting) return;

    // ✅ NEW: wenn Ordering disabled -> sofort blocken
    if (!this.orderingEnabled) {
      this.timeError = 'Bestellungen sind aktuell deaktiviert.';
      return;
    }

    // ✅ direkt vor Submit nochmals validieren (Menüwechsel/availability)
    this.cartService.validateCartAgainstActiveMenu().subscribe(res => {
      this.cartItems = this.cartService.getCartItems();

      if (res.clearedBecauseMenuChanged) {
        this.timeError = 'Menü wurde gewechselt – Warenkorb wurde zurückgesetzt. Bitte neu auswählen.';
        return;
      }
      if (res.removedItemsCount > 0) {
        this.timeError = 'Einige Artikel waren nicht mehr verfügbar und wurden entfernt. Bitte prüfe deinen Warenkorb.';
        return;
      }

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
      cutoff.setHours(13, 20, 0, 0);

      const weekday = now.getDay();
      if (weekday === 0 || weekday === 6) {
        this.timeError = 'Bestellungen sind nur von Montag bis Freitag möglich.';
        return;
      }

      if (now > cutoff) {
        this.timeError = 'Bestellungen können nur bis 11:20 Uhr am selben Tag aufgegeben werden.';
        return;
      }

      const deliveryTimeIso = this.buildDeliveryTimeIso(this.selectedTime);
      if (!deliveryTimeIso) {
        this.timeError = 'Bitte wähle eine gültige Uhrzeit.';
        return;
      }

      const totalPrice = this.getTotal();
      if (totalPrice > this.available) {
        this.timeError = 'Nicht genug verfügbares Guthaben.';
        return;
      }

      this.timeError = '';

      const dto: CreateOrderDto = {
        items: this.cartItems.map((item: any): CreateOrderItemDto => ({
          menuItemId: String(item.menuItem.id),
          quantity: Number(item.quantity ?? 0),
          note: (item.note ?? '').toString(),
          deliveryTime: deliveryTimeIso,
        })),
      };

      if (dto.items.some(i => !i.menuItemId || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
        this.timeError = 'Ungültige Bestellpositionen.';
        return;
      }

      this.submitting = true;

      this.cartService.submitOrder(dto).subscribe({
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
    });
  }

  navigateBack(): void {
    this.router.navigate(['/']);
  }
}
