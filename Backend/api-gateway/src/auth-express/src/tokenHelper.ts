import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import crypto from 'node:crypto';
import { PG_POOL } from '../../db';

export type DbTokenType = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

export function _createRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function _hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function _createDbToken(params: { userId: string; type: DbTokenType; ttlMinutes: number }, pool: Pool) {
  const token = _createRandomToken();
  const tokenHash = _hashToken(token);

  await pool.query(
    `INSERT INTO app.auth_tokens (user_id, token_type, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [params.userId, params.type, tokenHash, params.ttlMinutes],
  );

  return token;
}

export const createRandomToken = _createRandomToken;
export const hashToken = _hashToken;
export const createDbToken = _createDbToken;

@Injectable()
export class DbTokenService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  createRandomToken(): string {
    return _createRandomToken();
  }

  hashToken(token: string): string {
    return _hashToken(token);
  }

  async createDbToken(params: { userId: string; type: DbTokenType; ttlMinutes: number }) {
    return _createDbToken(params, this.db);
  }
}
