import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from './config.js';

export interface AuthJwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface AuthedRequest extends Request {
  auth?: AuthJwtPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}