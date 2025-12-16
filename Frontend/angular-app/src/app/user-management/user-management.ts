import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserItemsComponent } from '../user-items/user-items';
import { User } from '../../models/user.model';
import { UserService } from '../services/user/user-service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, UserItemsComponent],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  currentPage = 1;
  usersPerPage = 5;
  pages: number[] = [];
  searchTerm = '';
  showImpressumPopup = false;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
      this.filterUsers();
    });
  }

  filterUsers(): void {
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user => 
        user.name.toLowerCase().includes(searchLower)
      );
    }
    this.currentPage = 1; 
    this.updatePagination();
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterUsers();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.usersPerPage;
    const end = start + this.usersPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
    this.updatePages();
  }

  updatePages(): void {
    const total = this.totalPages;
    this.pages = Array.from({ length: total }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  changeUsersPerPage(count: number): void {
    this.usersPerPage = count;
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.usersPerPage);
  }

  deleteUser(user: User): void {
    if (user.balance !== 0) {
      alert(`Benutzer "${user.name}" kann nicht gelöscht werden, solange das Guthaben (${user.balance}) ungleich 0 ist.`);
      return;
    }

    const confirmed = confirm(`Benutzer "${user.name}" wirklich löschen?`);
    if (!confirmed) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.filterUsers();
      },
      error: (err) => {
        console.error(err);
        if (err?.message === 'NON_ZERO_BALANCE') {
          alert(`Benutzer "${user.name}" kann nur gelöscht werden, wenn das Guthaben 0 ist.`);
        } else {
          alert('Benutzer konnte nicht gelöscht werden.');
        }
      }
    });
  }

  resetPassword(user: User): void {
    const confirmed = confirm(`Passwort für "${user.name}" wirklich zurücksetzen?`);
    if (!confirmed) return;

    this.userService.resetPassword(user.id).subscribe({
      next: (newPassword) => {
        // In echt würdest du das per Mail schicken – hier nur Simulation:
        alert(`Neues Passwort für "${user.name}": ${newPassword}`);
      },
      error: (err) => {
        console.error(err);
        alert('Passwort konnte nicht zurückgesetzt werden.');
      }
    });
  }

  blockUser(user: User): void {
    this.userService.toggleBlockUser(user).subscribe(updated => {
      const index = this.users.findIndex(u => u.id === updated.id);
      if (index !== -1) this.users[index] = updated;
      this.filterUsers(); 
    });
  }
}
