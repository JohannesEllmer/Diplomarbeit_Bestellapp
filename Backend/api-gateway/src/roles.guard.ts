import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!allowed || allowed.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const role: Role | undefined = req.user?.role;

    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }
    return true;
  }
}
