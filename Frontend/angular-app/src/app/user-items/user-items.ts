import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-items',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-items.html',
  styleUrls: ['./user-items.css']
})
export class UserItemsComponent {
  @Input() user!: User;
  @Output() delete = new EventEmitter<User>();
  @Output() block = new EventEmitter<User>();
  @Output() resetPassword = new EventEmitter<User>();

  // ✅ template-sicherer Zustand (statt user.showDetails / casting)
  showDetails = false;

  constructor(private router: Router) {}

  toggleDetails(event: Event): void {
    event.stopPropagation();
    this.showDetails = !this.showDetails;
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
    this.router.navigate(['/users', this.user.id]);
  }

  onResetPasswordClick(event: Event): void {
    event.stopPropagation();
    this.resetPassword.emit(this.user);
  }
}
