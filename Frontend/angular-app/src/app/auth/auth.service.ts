import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { User, UserRole } from '../../models/user.model';
import { environment } from '../services/env';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiBaseUrl;

  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  constructor(private http: HttpClient, private router: Router) {}

  private save(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  }

  getCurrentRole(): UserRole | null {
    return this.getCurrentUser()?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.router.navigate(['/login']);
  }

  checkAccountExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/auth/check-email`, { params: { email } })
      .pipe(map(res => res.exists));
  }

  register(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  class: string;
  schoolType: 'HTL' | 'HAK';
  isTeacher: boolean;
}): Observable<{ ok: true; emailVerificationSent: boolean }> {
  return this.http.post<{ ok: true; emailVerificationSent: boolean }>(`${this.apiUrl}/auth/register`, payload);
}


  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.save(res.token, res.user)), map(res => res.user));
  }

  verifyEmail(token: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/auth/verify-email`, { token });
  }

 forgotPassword(email: string): Observable<{ ok: true }> {
  return this.http.post<{ ok: true }>(
    `${this.apiUrl}/auth/forgot-password`,
    { email: String(email).trim() },
    { headers: { 'Content-Type': 'application/json' } }
  );
}


  resetPassword(token: string, newPassword: string): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
  }

 changePassword(oldPassword: string, newPassword: string): Observable<{ ok: true }> {
  return this.http.post<{ ok: true }>(`${this.apiUrl}/auth/change-password`, {
    currentPassword: oldPassword, 
    newPassword
  });
}


  setCurrentUser(user: User): void {
    const token = this.getToken();
    if (!token) return;        
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}
