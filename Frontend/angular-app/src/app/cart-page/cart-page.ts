import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderItem } from '../../models/menu-item.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartItemComponent } from '../cart-item/cart-item';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CartItemComponent],
  templateUrl: './cart-page.html',
  styleUrls: ['./cart-page.css']
})
export class CartPageComponent implements OnInit {
  cartItems: OrderItem[] = [];
  deliveryTimeOptions: string[] = ['11:30', '12:00', '12:30', '13:00'];
  selectedTime: string = '';
  timeError: string = '';
  balance: number = 30.00; // Beispiel-Guthaben, könnte später aus User-State geladen werden

  constructor(private router: Router) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('cartItems');
    this.cartItems = stored ? JSON.parse(stored) : [];
  }

  saveToLocalStorage(): void {
    localStorage.setItem('cartItems', JSON.stringify(this.cartItems));
  }

  increaseQuantity(index: number): void {
    this.cartItems[index].quantity += 1;
    this.saveToLocalStorage();
  }

  decreaseQuantity(index: number): void {
    if (this.cartItems[index].quantity > 1) {
      this.cartItems[index].quantity -= 1;
      this.saveToLocalStorage();
    }
  }

  updateNote(index: number, note: string): void {
    this.cartItems[index].note = note;
    this.saveToLocalStorage();
  }

  removeItem(index: number): void {
    this.cartItems.splice(index, 1);
    this.saveToLocalStorage();
  }

  getAllergens(allergens: string[] | undefined): string {
    return allergens?.join(', ') || '-';
  }

  getTotal(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  }

  isValidTimeFormat(time: string): boolean {
    return /^\d{2}:\d{2}$/.test(time) && !isNaN(Date.parse(`1970-01-01T${time}:00`));
  }

  onOrder(): void {
    if (!this.isValidTimeFormat(this.selectedTime)) {
      this.timeError = 'Bitte gib eine gültige Uhrzeit im Format HH:mm ein.';
      return;
    }

    this.timeError = '';

    const bestellung = {
      zeit: this.selectedTime,
      gesamtbetrag: this.getTotal(),
      guthaben: this.balance,
      positionen: this.cartItems.map(item => ({
        gericht: item.menuItem.title,
        menge: item.quantity,
        einzelpreis: item.menuItem.price,
        gesamtpreis: item.menuItem.price * item.quantity,
        anmerkung: item.note || ''
      }))
    };

    console.log('Bestellung als JSON:', bestellung);

    alert('Bestellung erfolgreich übermittelt.\nDetails siehe Konsole.');

    // hier API call

    // Clear cart
    this.cartItems = [];
    localStorage.removeItem('cartItems');
    this.selectedTime = '';
  }

  navigateBack() {
    this.router.navigate(['/']);
  }
}
