import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem, OrderItem } from '../../models/menu-item.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-item-component.html',
  styleUrls: ['./menu-item-component.css']
})
export class MenuItemComponent {
  @Input() item!: MenuItem;
  @Output() addItem = new EventEmitter<OrderItem>();
  
  showNoteInput = false;
  note = '';

  toggleNoteInput() {
    this.showNoteInput = !this.showNoteInput;
    if (!this.showNoteInput) this.note = '';
  }

  addToOrder() {
    this.addItem.emit({
      menuItem: this.item,
      note: this.note
    });
    this.showNoteInput = false;
    this.note = '';
  }
}