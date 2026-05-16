import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClassPolicyGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    const user = this.auth.getCurrentUser();

    if (!this.auth.isLoggedIn() || !user) return true;

    if ((user as any).blocked) {
      return this.router.createUrlTree(['/user-profile']);
    }

    return true;
  }
}
