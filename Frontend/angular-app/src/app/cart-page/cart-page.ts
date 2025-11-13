import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CartItemComponent } from '../cart-item/cart-item';
import { OrderItem } from '../../models/menu-item.model';
import { CartService } from '../services/cart/cart-service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CartItemComponent],
  templateUrl: './cart-page.html',
  styleUrls: ['./cart-page.css']
})
export class CartPageComponent implements OnInit {
  showImpressumPopup = false;
  cartItems: OrderItem[] = [];
  deliveryTimeOptions: string[] = ['12:20', '13:10'];
  selectedTime: string = '';
  timeError: string = '';
  balance: number = 30.00;

  constructor(private router: Router, private cartService: CartService) {}

  ngOnInit(): void {
    this.cartItems = this.cartService.getCartItems();
  }

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

  getAllergens(allergens: string[] | undefined): string {
    return allergens?.join(', ') || '-';
  }

  getTotal(): number {
    return this.cartService.getTotal(this.cartItems);
  }

  onOrder(): void {
    if (!this.cartService.isValidTimeFormat(this.selectedTime)) {
      this.timeError = 'Bitte gib eine gültige Uhrzeit im Format HH:mm ein.';
      return;
    }
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(13, 20, 0, 0); // 11:20 Uhr heute

    const weekday = now.getDay();
    if (weekday === 0 || weekday === 6) {
      this.timeError = 'Bestellungen sind nur von Montag bis Freitag möglich.';
      return;
    }

    if (now > cutoff) {
      this.timeError = 'Bestellungen können nur bis 11:20 Uhr am selben Tag aufgegeben werden.';
      return;
    }

    this.timeError = '';
    const bestellung = {
      zeit: this.selectedTime,
      gesamtbetrag: this.getTotal(),
      guthaben: this.balance,
      positionen: this.cartItems.map(item => ({
        gericht: item.menuItem.name,
        menge: item.quantity,
        einzelpreis: item.menuItem.price,
        gesamtpreis: item.menuItem.price * item.quantity,
        anmerkung: item.note || ''
      }))
    };

    this.cartService.submitOrder(bestellung).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.cartItems = [];
        this.selectedTime = '';
        this.router.navigate(['/my-orders']);
      },
      error: () => {
        alert('Fehler beim Übermitteln der Bestellung.');
      }
    });
  }

  navigateBack(): void {
    this.router.navigate(['/']);
  }
}
