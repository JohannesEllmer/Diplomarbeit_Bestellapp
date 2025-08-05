import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserItemsComponent } from '../user-items/user-items';
import { User } from '../../models/user.model';
import { UserService } from '../user-service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, UserItemsComponent],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  paginatedUsers: User[] = [];
  currentPage = 1;
  usersPerPage = 5;
  pages: number[] = [];

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users;
      this.updatePagination();
    });
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.usersPerPage;
    const end = start + this.usersPerPage;
    this.paginatedUsers = this.users.slice(start, end);
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
    return Math.ceil(this.users.length / this.usersPerPage);
  }

  deleteUser(user: User): void {
    this.userService.deleteUser(user.id).subscribe(() => {
      this.users = this.users.filter(u => u.id !== user.id);
      this.updatePagination();
    });
  }

  blockUser(user: User): void {
    this.userService.toggleBlockUser(user).subscribe(updated => {
      const index = this.users.findIndex(u => u.id === updated.id);
      if (index !== -1) this.users[index] = updated;
      this.updatePagination();
    });
  }
}
