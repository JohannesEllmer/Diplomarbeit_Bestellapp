import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { User } from '../../../models/user.model';
import { environment } from '../../env';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private mockUsers: User[] = [
    {
      id: 101,
      name: 'Anna Müller',
      email: 'anna@example.com',
      class: '3A',
      orderCount: 5,
      balance: 10.00,
      blocked: false,
    },
    {
      id: 102,
      name: 'Max Mustermann',
      email: 'max@example.com',
      class: '4B',
      orderCount: 3,
      balance: 5.00,
      blocked: false,
    },
    {
      id: 103,
      name: 'Lisa Schmidt',
      email: 'lisa@example.com',
      class: '5C',
      orderCount: 7,
      balance: 8.50,
      blocked: false,
    }
  ];

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return environment.useMockData
      ? of(this.mockUsers)
      : this.http.get<User[]>('/api/users');
  }

  deleteUser(userId: number): Observable<void> {
    if (environment.useMockData) {
      this.mockUsers = this.mockUsers.filter(u => u.id !== userId);
      return of();
    }
    return this.http.delete<void>(`/api/users/${userId}`);
  }

  toggleBlockUser(user: User): Observable<User> {
    const updatedUser = { ...user, blocked: !user.blocked };
    if (environment.useMockData) {
      const index = this.mockUsers.findIndex(u => u.id === user.id);
      if (index !== -1) this.mockUsers[index] = updatedUser;
      return of(updatedUser);
    }
    return this.http.put<User>(`/api/users/${user.id}`, updatedUser);
  }

  updateBalance(user: User, amount: number): Observable<User> {
    const updatedUser = { ...user, balance: user.balance + amount };
    if (environment.useMockData) {
      const index = this.mockUsers.findIndex(u => u.id === user.id);
      if (index !== -1) this.mockUsers[index] = updatedUser;
      return of(updatedUser);
    }
    return this.http.put<User>(`/api/users/${user.id}`, updatedUser);
  }
}
