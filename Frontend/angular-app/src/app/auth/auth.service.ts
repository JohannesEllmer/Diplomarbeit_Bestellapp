// src/app/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { User, UserRole } from '../../models/user.model';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // ---------------- Storage ----------------

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
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
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

  // ---------------- Backend Calls ----------------

  checkAccountExists(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/auth/check-email`, {
        params: { email }
      })
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
  }): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/register`, payload)
      .pipe(
        tap(res => this.save(res.token, res.user)),
        map(res => res.user)
      );
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(res => this.save(res.token, res.user)),
        map(res => res.user)
      );
  }
}


/*
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { User, UserRole } from '../../models/user.model';

interface StoredUser extends User {
  password: string; // nur für Simulation, nicht in Produktion so lassen
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private usersKey = 'users';
  private currentUserKey = 'currentUser';

  constructor() {
    this.ensureDemoUsers();
  }

  // ------------ helpers für localStorage ------------

  private loadUsers(): StoredUser[] {
    const raw = localStorage.getItem(this.usersKey);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredUser[];
    } catch {
      return [];
    }
  }

  private saveUsers(users: StoredUser[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  private saveCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.currentUserKey);
    }
  }

  private ensureDemoUsers() {
    const users = this.loadUsers();
    if (users.length > 0) return;

    const demo: StoredUser[] = [
      {
        id: '1',
        name: 'Admin Benutzer',
        email: 'admin@local',
        class: 'ADMIN',
        orderCount: 0,
        balance: 0,
        blocked: false,
        role: 'ADMIN',
        isTeacher: false,
        password: 'admin'
      },
      {
        id: '2',
        name: 'Inhaber Benutzer',
        email: 'chef@local',
        class: 'INHABER',
        orderCount: 0,
        balance: 0,
        blocked: false,
        role: 'INHABER',
        isTeacher: false,
        password: 'chef'
      },
      {
        id: '3',
        name: 'Kunde Demo',
        email: 'kunde@local',
        class: '3AHIF',
        orderCount: 2,
        balance: 15,
        blocked: false,
        role: 'KUNDE',
        isTeacher: false,
        password: 'kunde'
      }
    ];

    this.saveUsers(demo);
  }

  // ------------ öffentliche API ------------

  checkAccountExists(email: string): Observable<boolean> {
    const users = this.loadUsers();
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    return of(exists);
  }

  register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    class: string;
    schoolType: 'HTL' | 'HAK';
    isTeacher: boolean;
  }): Observable<User> {
    const users = this.loadUsers();
    const emailLower = payload.email.toLowerCase();

    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      return throwError(() => new Error('ACCOUNT_EXISTS'));
    }

    const stored: StoredUser = {
      id: String(Date.now()),
      name: `${payload.firstName} ${payload.lastName}`,
      email: emailLower,
      class: payload.class,
      orderCount: 0,
      balance: 0,
      blocked: false,
      role: 'KUNDE', // Registrierung => immer Kunde
      isTeacher: payload.isTeacher,
      password: payload.password
    };

    users.push(stored);
    this.saveUsers(users);

    const { password, ...publicUser } = stored;
    this.saveCurrentUser(publicUser);

    return of(publicUser);
  }

  login(email: string, password: string): Observable<User> {
    const users = this.loadUsers();
    const emailLower = email.toLowerCase();

    const found = users.find(
      u => u.email.toLowerCase() === emailLower && u.password === password
    );

    if (!found) {
      return throwError(() => new Error('INVALID_CREDENTIALS'));
    }

    const { password: pw, ...publicUser } = found;
    this.saveCurrentUser(publicUser);
    return of(publicUser);
  }

  logout(): void {
    this.saveCurrentUser(null);
  }

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(this.currentUserKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  getCurrentRole(): UserRole | null {
    return this.getCurrentUser()?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }
}
*/