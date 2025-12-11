import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, map } from 'rxjs';
import { User } from '../../../models/user.model';
import { environment } from '../../env';

@Injectable({ providedIn: 'root' })
export class UserService {
  private mockUsers: (User & { password?: string })[] = [
    { id: '101', name: 'Anna Müller', email: 'anna@example.com', class: '3A', orderCount: 5, balance: 10.00, blocked: false, password: 'anna', role: 'ADMIN' },
    { id: '102', name: 'Max Mustermann', email: 'max@example.com', class: '4B', orderCount: 3, balance: 5.00, blocked: false, password: 'max', role: 'KUNDE' },
    { id: '103', name: 'Lisa Schmidt', email: 'lisa@example.com', class: '5C', orderCount: 7, balance: 8.50, blocked: false, password: 'lisa', role: 'INHABER' },
  ];

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return environment.useMockData
      ? of(this.mockUsers)
      : this.http.get<User[]>('/api/users');
  }

  // --- angepasst: Löschen nur bei Guthaben 0 ---

  deleteUser(userId: string): Observable<void> {
    if (environment.useMockData) {
      const user = this.mockUsers.find(u => u.id === userId);
      if (user && user.balance !== 0) {
        return throwError(() => new Error('NON_ZERO_BALANCE'));
      }
      this.mockUsers = this.mockUsers.filter(u => u.id !== userId);
      return of(void 0);
    }

    // Im echten Backend sollte die gleiche Regel gelten (Balance prüfen).
    return this.http.delete<void>(`/api/users/${userId}`);
  }

  toggleBlockUser(user: User): Observable<User> {
    const updatedUser = { ...user, blocked: !user.blocked };
    if (environment.useMockData) {
      const index = this.mockUsers.findIndex(u => u.id === user.id);
      if (index !== -1) this.mockUsers[index] = { ...this.mockUsers[index], ...updatedUser };
      return of(updatedUser);
    }
    return this.http.put<User>(`/api/users/${user.id}`, updatedUser);
  }

  updateBalance(user: User, amount: number): Observable<User> {
    const updatedUser = { ...user, balance: user.balance + amount };
    if (environment.useMockData) {
      const index = this.mockUsers.findIndex(u => u.id === user.id);
      if (index !== -1) this.mockUsers[index] = { ...this.mockUsers[index], ...updatedUser };
      return of(updatedUser);
    }
    return this.http.put<User>(`/api/users/${user.id}`, updatedUser);
  }

  // --- NEU: Passwort zurücksetzen ---

  resetPassword(userId: string): Observable<string> {
    if (environment.useMockData) {
      const user = this.mockUsers.find(u => u.id === userId);
      if (!user) {
        return throwError(() => new Error('USER_NOT_FOUND'));
      }

      const newPassword = 'pw-' + Math.floor(100000 + Math.random() * 900000); // z.B. pw-123456
      user.password = newPassword;
      return of(newPassword);
    }

    // Beispiel-API im echten Backend:
    return this.http
      .post<{ newPassword: string }>(`/api/users/${userId}/reset-password`, {})
      .pipe(map(res => res.newPassword));
  }
}
