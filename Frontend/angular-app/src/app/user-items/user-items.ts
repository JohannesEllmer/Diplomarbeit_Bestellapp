import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { UserService } from '../services/user/user-service';

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

  constructor(private router: Router, private userService: UserService) {}

  toggleDetails(event: Event): void {
    event.stopPropagation();
    this.user.showDetails = !this.user.showDetails;
  }

  startEditBalance(event: Event): void {
    event.stopPropagation();
    this.user.editingBalance = true;
    this.user.newBalance = 0;
  }

  saveBalance(event: Event): void {
    event.stopPropagation();
    if (this.user.newBalance !== undefined) {
      this.userService.updateBalance(this.user, this.user.newBalance).subscribe(updated => {
        this.user.balance = updated.balance;
        this.user.editingBalance = false;
      });
    }
  }

  emitDelete(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.user);
  }

  emitBlock(event: Event): void {
    event.stopPropagation();
    this.block.emit(this.user);
  }

  navigateToUser(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/users', this.user.id]); // korrigierter Pfad
  }
}
