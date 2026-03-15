import type { INestApplication } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../src/db';
import { expect } from '@jest/globals';

export function getDbPool(app: INestApplication): Pool {
  // 1) bevorzugt deinen PG_POOL Token
  const viaToken = app.get(PG_POOL as any, { strict: false }) as Pool | undefined;
  if (viaToken) return viaToken;

  // 2) fallback: Pool als class provider (wie in deinem bestehenden util)
  const viaClass = app.get((require('pg').Pool as any) as any, { strict: false }) as Pool | undefined;
  if (viaClass) return viaClass;

  throw new Error(
    [
      'Kein pg Pool Provider gefunden.',
      '=> Stelle sicher, dass du den Pool als Provider registriert hast (PG_POOL oder Pool class).',
    ].join('\n'),
  );
}

export async function ensureCleanupSchema(pool: Pool) {
  await pool.query(`
    ALTER TABLE app.users
    ADD COLUMN IF NOT EXISTS blocked_at timestamptz NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app.pending_deletions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
      user_name text NULL,
      user_email text NOT NULL,
      user_class text NULL,
      blocked_since timestamptz NOT NULL,
      planned_deletion_at timestamptz NOT NULL,
      status text NOT NULL DEFAULT 'PENDING',
      admin_notified_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pending_deletions_user_id
      ON app.pending_deletions(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pending_deletions_status
      ON app.pending_deletions(status);
  `);
}

export async function simulateBlocked3Years(pool: Pool, userId: string) {
  // blocked=true und blocked_at = now - 3y - 1d
  await pool.query(
    `
    UPDATE app.users
    SET blocked = TRUE,
        blocked_at = NOW() - interval '3 years' - interval '1 day'
    WHERE id = $1
    `,
    [userId],
  );
}

export async function markUserBlockedNow(pool: Pool, userId: string) {
  await pool.query(
    `
    UPDATE app.users
    SET blocked = TRUE,
        blocked_at = NOW()
    WHERE id = $1
    `,
    [userId],
  );
}

export async function getPendingDeletion(pool: Pool, userId: string) {
  const r = await pool.query(
    `SELECT * FROM app.pending_deletions WHERE user_id=$1 AND status='PENDING' LIMIT 1`,
    [userId],
  );
  return r.rows?.[0] ?? null;
}

export async function expectUserFullyDeleted(pool: Pool, userId: string) {
  const u = await pool.query(`SELECT 1 FROM app.users WHERE id=$1`, [userId]);
  expect(u.rowCount).toBe(0);

  const tok = await pool.query(`SELECT 1 FROM app.auth_tokens WHERE user_id=$1`, [userId]);
  expect(tok.rowCount).toBe(0);

  const cred = await pool.query(`SELECT 1 FROM app.auth_credentials WHERE user_id=$1`, [userId]);
  expect(cred.rowCount).toBe(0);

  const bcr = await pool.query(`SELECT 1 FROM app.balance_change_requests WHERE user_id=$1`, [userId]);
  expect(bcr.rowCount).toBe(0);

  const blog = await pool.query(`SELECT 1 FROM app.balance_logs WHERE user_id=$1`, [userId]);
  expect(blog.rowCount).toBe(0);

  const ord = await pool.query(`SELECT 1 FROM app.orders WHERE user_id=$1`, [userId]);
  expect(ord.rowCount).toBe(0);

  // order_items hängen an orders → wenn orders weg sind, sind auch die items weg
  // (aber wir prüfen trotzdem indirekt)
}