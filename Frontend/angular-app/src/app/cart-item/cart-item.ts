import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { OrderItem } from '../../models/menu-item.model';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-item.html',
  styleUrls: ['./cart-item.css']
})
export class CartItemComponent implements OnInit {
  @Input() item!: OrderItem;

  @Output() increase = new EventEmitter<void>();
  @Output() decrease = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() noteChange = new EventEmitter<string>();

  displayNote = '';

  ngOnInit(): void {
    this.displayNote = this.item.note ?? '';
  }

  onNoteChange(): void {
    this.noteChange.emit(this.displayNote);
  }

  get isMenu(): boolean {
    return !!(this.item.menuItem.drink || this.item.menuItem.dessert);
  }

  get menuTitle(): string {
    return this.isMenu ? 'Menü' : '';
  }

  get menuDrink(): string | null {
    return this.item.menuItem.drink ?? null;
  }

  get menuDessert(): string | null {
    return this.item.menuItem.dessert ?? null;
  }

  get totalPrice(): number {
    return Number(this.item.menuItem.price ?? 0) * Number(this.item.quantity ?? 0);
  }
}
