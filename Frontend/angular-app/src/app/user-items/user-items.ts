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

  /**
   * Editiermodus starten:
   * - Ausgangsstand merken (editingBaseBalance)
   * - Eingabefeld mit aktuellem Kontostand vorbefüllen
   */
  startEditBalance(event: Event): void {
    event.stopPropagation();
    this.user.editingBalance = true;
    this.user.editingBaseBalance = this.user.balance;
    this.user.newBalance = this.user.balance;
  }

  /**
   * Speichern:
   * - newBalance wird als "gewünschter neuer Kontostand" verstanden
   * - diff = newBalance - editingBaseBalance
   * - an den Service wird nur die Differenz übergeben
   */
  saveBalance(event: Event): void {
    event.stopPropagation();

    if (this.user.newBalance === undefined || this.user.editingBaseBalance === undefined) {
      this.user.editingBalance = false;
      return;
    }

    const base = this.user.editingBaseBalance;
    const target = this.user.newBalance;
    const diff = target - base;

    // Wenn sich nichts geändert hat, brauchen wir nichts zu speichern
    if (diff === 0) {
      this.user.editingBalance = false;
      this.user.editingBaseBalance = undefined;
      return;
    }

    this.userService.updateBalance(this.user, diff).subscribe(updated => {
      // Backend hat den neuen Stand berechnet und zurückgegeben
      this.user.balance = updated.balance;
      this.user.editingBalance = false;
      this.user.editingBaseBalance = undefined;
    });
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
}
