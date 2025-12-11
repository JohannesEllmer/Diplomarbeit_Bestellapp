import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../models/user.model';

export function authGuard(allowedRoles?: UserRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const user = auth.getCurrentUser();
      if (!user || !allowedRoles.includes(user.role)) {
        // z.B. auf Startseite oder "Forbidden"-Seite
        router.navigate(['/']);
        return false;
      }
    }

    return true;
  };
}
