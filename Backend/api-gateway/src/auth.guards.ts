import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthJwtPayload {
  sub: string; // userId
  email?: string;
  role?: 'KUNDE' | 'INHABER' | 'ADMIN';
  sid?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();

    if (req.method === 'OPTIONS') return true;

    const header: string = req.headers?.authorization ?? '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('AUTH_REQUIRED');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new UnauthorizedException('JWT_SECRET_NOT_CONFIGURED');

    try {
      req.user = jwt.verify(token, secret) as AuthJwtPayload;
      return true;
    } catch {
      throw new UnauthorizedException('INVALID_TOKEN');
    }
  }
}
