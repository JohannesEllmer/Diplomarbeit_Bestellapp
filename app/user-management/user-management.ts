import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserItemsComponent } from '../user-items/user-items';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, UserItemsComponent],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent {
  users: User[] = [
    {
      id: 1,
      name: 'Max Mustermann',
      email: 'max@example.com',
      class: '10A',
      orderCount: 12,
      balance: 25.0,
      blocked: false
    },
    {
      id: 2,
      name: 'Anna Beispiel',
      email: 'anna@example.com',
      class: '9B',
      orderCount: 8,
      balance: 15.5,
      blocked: false
    }
  ];

  deleteUser(user: User): void {
    this.users = this.users.filter(u => u.id !== user.id);
  }

  blockUser(user: User): void {
    if (user.blocked == false) {
      user.blocked = true;
      alert(`${user.name} wurde gesperrt.`);
    }else{
      user.blocked = false;
      alert(`${user.name} wurde entsperrt.`);
    }
  }
}
