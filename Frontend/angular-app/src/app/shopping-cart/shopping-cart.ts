// shopping-cart.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingCartService } from '../services/shopping-cart';
import { Router } from '@angular/router';
import { OrderItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shopping-cart.html',
  styleUrls: ['./shopping-cart.css']
})
export class ShoppingCartComponent {
  public cartService = inject(ShoppingCartService);
  private router = inject(Router);
  
  selectedItems: OrderItem[] = this.cartService.getItems();

  updateNote(index: number, note: string): void {
    if (index >= 0 && index < this.selectedItems.length) {
      this.selectedItems[index].note = note;
    }
  }

  removeItem(index: number): void {
    if (index >= 0 && index < this.selectedItems.length) {
      this.cartService.removeItem(index);
      // Aktualisiere die lokale Kopie nach Änderung
      this.selectedItems = this.cartService.getItems();
    }
  }

  get totalCost(): number {
    return this.cartService.getTotal();
  }

  checkout(): void {
    if (this.selectedItems.length > 0) {
      alert(`Bestellung abgeschlossen!\nGesamtbetrag: €${this.totalCost.toFixed(2)}`);
      this.cartService.clearCart();
      this.selectedItems = [];
      this.router.navigate(['/menu']);
    }
  }

  backToMenu(): void {
    this.router.navigate(['/menu']);
  }
}