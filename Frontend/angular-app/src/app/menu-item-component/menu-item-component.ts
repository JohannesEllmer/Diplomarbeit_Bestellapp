import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from '../../models/menu-item.model';
import { Menu } from '../../models/menu.model';
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
  @Input() menu?: Menu;        
  @Output() addItem = new EventEmitter<string>();

  note: string = '';

  addToOrder(): void {
    const trimmedNote = this.note.trim();
    const menuHint = this.menu
      ? ` [Menü: ${this.menu.title}${this.menu.drink ? ', Getränk: ' + this.menu.drink : ''}${this.menu.dessert ? ', Dessert: ' + this.menu.dessert : ''}]`
      : '';
    this.addItem.emit(trimmedNote + (this.menu ? menuHint : ''));
    this.note = '';
  }
}
