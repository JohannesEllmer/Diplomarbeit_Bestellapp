// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import { pool } from './db.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'NO_TOKEN' });
  }

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const sessionId = decoded.sid as string;
    const userId = decoded.sub as string;

    // Session in DB prüfen
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.blocked, a.auth_token
       FROM app.users u
       JOIN app.auth_credentials a ON a.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'INVALID_SESSION' });
    }

    const row = result.rows[0];

    if (row.blocked || row.auth_token !== sessionId) {
      return res.status(401).json({ error: 'SESSION_REVOKED' });
    }

    req.user = {
      id: row.id,
      email: row.email,
      role: row.role,
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}
