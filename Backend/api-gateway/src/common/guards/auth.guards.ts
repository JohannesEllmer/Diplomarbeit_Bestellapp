import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest();
        // TODO: JWT prüfen; Test-Fallback:
        if (!req.user) req.user = { id: '00000000-0000-0000-0000-000000000001', role: 'user' };
        return true;
    }
}
