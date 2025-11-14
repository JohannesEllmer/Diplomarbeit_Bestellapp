import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe], 
  styleUrls: ['./cart-item.css'],
  templateUrl: './cart-item.html',
  encapsulation: ViewEncapsulation.None 
})
export class CartItemComponent {
  @Input() item: any;
  @Output() remove = new EventEmitter<void>();
  @Output() increase = new EventEmitter<void>();
  @Output() decrease = new EventEmitter<void>();

  private apiBaseUrl = 'http://localhost:3000/api'; // Deine Backend-URL

  currentImageUrl: string = '';

  private parseMenuHint() {
    const note: string = this.item?.note || '';
    const match = note.match(/\[Menü:\s*([^\]]+)\]/);
    if (!match) return null;
    const content = match[1]; // e.g. "Titel, Getränk: X, Dessert: Y"
    const parts = content.split(',').map(p => p.trim()).filter(Boolean);
    const title = parts[0] || '';
    let drink = '';
    let dessert = '';
    parts.slice(1).forEach(p => {
      if (p.startsWith('Getränk:')) drink = p.replace('Getränk:', '').trim();
      if (p.startsWith('Dessert:')) dessert = p.replace('Dessert:', '').trim();
    });
    return { title, drink, dessert, raw: match[0] };
  }

  get isMenu(): boolean {
    return !!this.parseMenuHint();
  }

  get menuTitle(): string {
    return this.parseMenuHint()?.title || '';
  }

  get menuDrink(): string {
    return this.parseMenuHint()?.drink || '';
  }

  get menuDessert(): string {
    return this.parseMenuHint()?.dessert || '';
  }

  private get menuHintString(): string {
    const info = this.parseMenuHint();
    if (!info) return '';
    return info.raw;
  }

  // Two-way binding helper: show only the user's free-text note in the textarea
  get displayNote(): string {
    const note: string = this.item?.note || '';
    const hint = this.menuHintString;
    if (hint) return note.replace(hint, '').trim();
    return note;
  }

  set displayNote(value: string) {
    const hint = this.menuHintString;
    const trimmed = (value || '').trim();
    this.item.note = trimmed + (hint ? ' ' + hint : '');
  }


}