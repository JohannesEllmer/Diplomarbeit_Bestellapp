import { JwtPayload, verify } from 'jsonwebtoken';

export interface WsUser {
  userId: string;
  roles: string[];
}

export function parseWsUserFromToken(token?: string): WsUser | null {
  if (!token) return null;

  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    const payload = verify(raw, process.env.JWT_SECRET as string) as JwtPayload & any;

    const userId = String(payload.sub ?? payload.userId ?? '');
    const roles = Array.isArray(payload.roles) ? payload.roles.map(String) : [];

    if (!userId) return null;
    return { userId, roles };
  } catch {
    return null;
  }
}
