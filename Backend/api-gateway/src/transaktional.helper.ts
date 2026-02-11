import type { Pool, PoolClient } from 'pg';

export async function withTx<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c);
    await c.query('COMMIT'); return r;
  } catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
