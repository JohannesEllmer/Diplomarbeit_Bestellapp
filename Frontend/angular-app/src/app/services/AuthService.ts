import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  getCurrentUserId(): string {
    const raw = localStorage.getItem('currentUserId');
    return raw ? raw : '1'; 
  }
}
