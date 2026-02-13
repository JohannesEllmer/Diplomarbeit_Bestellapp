import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MenuItem } from '../../models/menu-item.model';
import { MealPlan } from '../../models/meal-plan.model';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-item-component.html',
  styleUrls: ['./menu-item-component.css']
})
export class MenuItemComponent {
  @Input() item!: MenuItem;
  @Input() menu: MealPlan | null = null;

  @Output() addItem = new EventEmitter<string>();

  note = '';

  get isExtraItem(): boolean {
    const id = String(this.item?.id ?? '');
    return id.startsWith('extra:');
  }

  get canOrder(): boolean {
    if (!this.item) return false;
    if (this.isExtraItem) return false;
    return this.item.available !== false;
  }

  get menuDrink(): string {
    return String((this.item as any)?.drink ?? '').trim();
  }

  get menuDessert(): string {
    return String((this.item as any)?.dessert ?? '').trim();
  }

  get isMenuSet(): boolean {
    return !!(this.menuDrink || this.menuDessert);
  }

  get typeLabel(): string {
    return this.isMenuSet ? 'Menü' : 'Gericht';
  }

  addToOrder(): void {
    if (!this.canOrder) return;
    const trimmedNote = (this.note ?? '').trim();
    this.addItem.emit(trimmedNote);
    this.note = '';
  }
}
