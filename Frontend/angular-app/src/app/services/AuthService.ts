import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // In echt aus Token/Storage laden:
  getCurrentUserId(): string {
    const raw = localStorage.getItem('currentUserId');
    return raw ? raw : '1'; // Fallback auf '1' für lokale Tests
  }
}
