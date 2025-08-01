import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/user.model';



@Component({
  selector: 'app-user-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-items.html',
  styleUrls: ['./user-items.css']
})
export class UserItemsComponent {
  @Input() user!: User;
  @Output() delete = new EventEmitter<User>();
  @Output() block = new EventEmitter<User>();

  toggleDetails(): void {
    this.user.showDetails = !this.user.showDetails;
  }

  startEditBalance(): void {
    this.user.editingBalance = !this.user.editingBalance;
    this.user.newBalance = 0;
  }

  saveBalance(): void {
    this.user.balance += this.user.newBalance ?? 0;
    this.user.editingBalance = false;
  }

  emitDelete(): void {
    this.delete.emit(this.user);
  }

  emitBlock(): void {
    this.block.emit(this.user);
  }
}
