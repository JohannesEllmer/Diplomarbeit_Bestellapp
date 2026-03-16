import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from './users/users.service';

@Injectable()
export class ClassPolicyGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (req.method === 'OPTIONS') return true;

    // wenn kein JWT-User (z.B. Login/Register) -> durchlassen
    const jwtUser = req.user;
    if (!jwtUser?.id && !jwtUser?.sub) return true;

    const userId = String(jwtUser?.id ?? jwtUser?.sub);

    const dbUser = await this.users.enforceLoginPolicy(userId);
    
    if (!dbUser) return true;
    if (!dbUser.blocked) return true;

    const path = String(req.originalUrl || req.url || '');

    const allowed =
      path.startsWith('/api/users/me/profile') ||
      path.startsWith('/api/users/me/activity') ||
      path.startsWith('/api/users/me/header') ||
      path.startsWith('/api/users/me/class') ||
      path.startsWith('/api/auth/change-password');

    if (allowed) return true;

    throw new ForbiddenException({
      error: 'USER_PROFILE_UPDATE_REQUIRED',
      message: 'Bitte Klasse aktualisieren (Account eingeschränkt).',
    });
  }
}
