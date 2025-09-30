import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MenuItem } from '../../models/menu-item.model';
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
  @Output() addItem = new EventEmitter<string>();

  note: string = '';
  

  ngOnInit() {
    
  }


  addToOrder(): void {
    const trimmedNote = this.note.trim();
    this.addItem.emit(trimmedNote); 
    this.note = '';
  }
}
