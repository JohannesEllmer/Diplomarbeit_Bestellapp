import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderItem } from '../../models/menu-item.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-page.html',
  styleUrls: ['./cart-page.css']
})
export class CartPageComponent implements OnInit {

  constructor(private router: Router) {}
  cartItems: OrderItem[] = [];

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
navigateBack() {
  this.router.navigate(['/']);
}

  getTotal(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  }
}
