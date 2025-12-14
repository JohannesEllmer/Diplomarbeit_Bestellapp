import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, map } from 'rxjs';
import { User } from '../../../models/user.model';
import { environment } from '../../env';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly usersEndpoint = `${this.apiBase}/users`;

  private mockUsers: (User & { password?: string })[] = [
    { id: '101', name: 'Anna Müller', email: 'anna@example.com', class: '3A', orderCount: 5, balance: 10.0, blocked: false, password: 'anna', role: 'ADMIN' as any },
  ];

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return environment.useMockData ? of(this.mockUsers) : this.http.get<User[]>(this.usersEndpoint);
  }

  deleteUser(userId: string): Observable<void> {
    if (environment.useMockData) {
      const user = this.mockUsers.find(u => u.id === userId);
      if (user && user.balance !== 0) return throwError(() => new Error('NON_ZERO_BALANCE'));
      this.mockUsers = this.mockUsers.filter(u => u.id !== userId);
      return of(void 0);
    }
    return this.http.delete<void>(`${this.usersEndpoint}/${userId}`);
  }

  toggleBlockUser(user: User): Observable<User> {
    const updatedUser = { ...user, blocked: !user.blocked };
    if (environment.useMockData) return of(updatedUser);

    // ⚠️ dein Backend hat PATCH /users/:id (nicht PUT)
    return this.http.patch<User>(`${this.usersEndpoint}/${user.id}`, { blocked: updatedUser.blocked });
  }

  updateBalance(user: User, amount: number): Observable<User> {
    const newBalance = user.balance + amount;
    if (environment.useMockData) return of({ ...user, balance: newBalance });

    // ⚠️ Backend: PATCH /users/:id
    return this.http.patch<User>(`${this.usersEndpoint}/${user.id}`, { balance: newBalance });
  }

  resetPassword(userId: string): Observable<string> {
    if (environment.useMockData) return of('pw-123456');

    // falls du so eine Route hast
    return this.http
      .post<{ newPassword: string }>(`${this.usersEndpoint}/${userId}/reset-password`, {})
      .pipe(map(res => res.newPassword));
  }
}
