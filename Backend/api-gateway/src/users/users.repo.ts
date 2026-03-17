import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

export class UsersRepo {
  async getPolicyRow(db: Pool, userId: string) {
    const res = await db.query(
      `
      SELECT id, "class", blocked, last_login_at
      FROM app.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async blockUserByInactivity(db: Pool, userId: string) {
    const res = await db.query(
      `
      UPDATE app.users
      SET blocked = TRUE,
          blocked_at = COALESCE(blocked_at, NOW())
      WHERE id = $1
      RETURNING id, "class", blocked
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async updateMyClass(db: Pool, userId: string, cls: string) {
    return db.query(
      `
      UPDATE app.users
      SET "class" = $2
      WHERE id = $1
      RETURNING id, name, email, "class", blocked, role
      `,
      [userId, cls],
    );
  }

  async getUserForBalanceRequests(db: Db, userId: string) {
    const res = await db.query(
      `
      SELECT id, balance, blocked
      FROM app.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async insertBalanceAddRequest(db: Pool, userId: string, delta: number): Promise<string> {
    const res = await db.query(
      `
      INSERT INTO app.balance_change_requests (
        user_id,
        kind,
        delta,
        is_used,
        created_at
      )
      VALUES ($1, 'add', $2, FALSE, NOW())
      RETURNING id
      `,
      [userId, delta],
    );
    return String(res.rows[0].id);
  }

  async insertBalanceFlushRequest(db: Pool, userId: string): Promise<string> {
    const res = await db.query(
      `
      INSERT INTO app.balance_change_requests (
        user_id,
        kind,
        delta,
        is_used,
        created_at
      )
      VALUES ($1, 'flush', 0, FALSE, NOW())
      RETURNING id
      `,
      [userId],
    );
    return String(res.rows[0].id);
  }

  async lockBalanceRequest(client: PoolClient, reqId: string) {
    return client.query(
      `
      SELECT id, user_id, kind, delta, is_used
      FROM app.balance_change_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [reqId],
    );
  }

  async lockUserForBalanceUpdate(client: PoolClient, userId: string) {
    return client.query(
      `
      SELECT id, balance, blocked
      FROM app.users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId],
    );
  }

  async setUserBalance(client: PoolClient, userId: string, newBalance: number) {
    await client.query(
      `
      UPDATE app.users
      SET balance = $2
      WHERE id = $1
      `,
      [userId, newBalance],
    );
  }

  async insertBalanceLog(
    client: PoolClient,
    p: {
      userId: string;
      delta: number;
      balanceAfter: number;
      reason: string;
      refId: string;
      actor: string;
    },
  ) {
    await client.query(
      `
      INSERT INTO app.balance_logs (
        user_id,
        delta,
        balance_after,
        reason,
        ref_type,
        ref_id,
        actor,
        created_at
      )
      VALUES ($1, $2, $3, $4, 'BALANCE_REQUEST', $5, $6, NOW())
      `,
      [p.userId, p.delta, p.balanceAfter, p.reason, p.refId, p.actor],
    );
  }

  async markRequestUsed(client: PoolClient, reqId: string, actorId: string) {
    await client.query(
      `
      UPDATE app.balance_change_requests
      SET is_used = TRUE,
          used_at = NOW(),
          used_by = $2
      WHERE id = $1
      `,
      [reqId, actorId],
    );
  }

  async sumOpenOrdersTotal(db: Db, userId: string): Promise<number> {
    const res = await db.query(
      `
      SELECT COALESCE(SUM(total_price), 0) AS s
      FROM app.orders
      WHERE user_id = $1
        AND status = 'open'
      `,
      [userId],
    );
    return Number(res.rows?.[0]?.s ?? 0);
  }

  async countOrders(db: Pool, userId: string): Promise<number> {
    const res = await db.query(
      `
      SELECT COUNT(*)::int AS c
      FROM app.orders
      WHERE user_id = $1
      `,
      [userId],
    );
    return Number(res.rows?.[0]?.c ?? 0);
  }

  async listMyOrdersForActivity(db: Pool, userId: string) {
    return db.query(
      `
      SELECT id, total_price, created_at, status
      FROM app.orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId],
    );
  }

  async listMyBalanceLogs(db: Pool, userId: string) {
    return db.query(
      `
      SELECT id, delta, balance_after, reason, ref_type, ref_id, actor, created_at
      FROM app.balance_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId],
    );
  }

  async deleteByUserId(db: Pool, userId: string) {
    await db.query(`DELETE FROM app.users WHERE id = $1`, [userId]);
  }

  async lockUserBalanceOnly(client: PoolClient, userId: string) {
    return client.query(
      `
      SELECT id, balance
      FROM app.users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId],
    );
  }

  async insertDirectBalanceLog(
    client: PoolClient,
    p: { userId: string; delta: number; balanceAfter: number },
  ) {
    await client.query(
      `
      INSERT INTO app.balance_logs (
        user_id,
        delta,
        balance_after,
        reason,
        actor,
        created_at
      )
      VALUES ($1, $2, $3, 'BALANCE_DELTA_DIRECT', 'system', NOW())
      `,
      [p.userId, p.delta, p.balanceAfter],
    );
  }

  async getUserBasic(db: Pool, userId: string) {
    const res = await db.query(
      `
      SELECT id, name, email, "class", balance, blocked, role
      FROM app.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async listUsersAdmin(db: Pool) {
    return db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u."class",
        COALESCE(COUNT(o.id), 0)::int AS order_count,
        u.balance,
        u.blocked,
        u.role
      FROM app.users u
      LEFT JOIN app.orders o
        ON o.user_id = u.id
      GROUP BY
        u.id,
        u.name,
        u.email,
        u."class",
        u.balance,
        u.blocked,
        u.role
      ORDER BY u.name ASC
      `,
    );
  }

  async getUserAdmin(db: Pool, userId: string) {
    return db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u."class",
        COALESCE(COUNT(o.id), 0)::int AS order_count,
        u.balance,
        u.blocked,
        u.role
      FROM app.users u
      LEFT JOIN app.orders o
        ON o.user_id = u.id
      WHERE u.id = $1
      GROUP BY
        u.id,
        u.name,
        u.email,
        u."class",
        u.balance,
        u.blocked,
        u.role
      LIMIT 1
      `,
      [userId],
    );
  }

  async getAdminUpdateBase(db: Pool, userId: string) {
    const res = await db.query(
      `
      SELECT id, blocked
      FROM app.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async updateAdminDynamic(db: Pool, setClause: string, values: any[]) {
    await db.query(
      `UPDATE app.users SET ${setClause} WHERE id = $${values.length}`,
      values,
    );
  }

  async insertUser(db: Pool, p: { name: string; email: string; cls: string | null; role: string }) {
    const res = await db.query(
      `
      INSERT INTO app.users (
        name,
        email,
        "class",
        role,
        blocked,
        blocked_at,
        balance,
        class_updated_at,
        last_login_at
      )
      VALUES ($1, $2, $3, $4, FALSE, NULL, 0, NOW(), NOW())
      RETURNING id
      `,
      [p.name, String(p.email).toLowerCase().trim(), p.cls, p.role],
    );
    return String(res.rows[0].id);
  }

  async listPendingDeletions(db: Pool) {
    return db.query(
      `
      SELECT
        id,
        user_id,
        user_name,
        user_email,
        user_class,
        blocked_since,
        planned_deletion_at
      FROM app.pending_deletions
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT 200
      `,
    );
  }

  async getUserForPurgePreview(db: Pool, userId: string) {
    const res = await db.query(
      `
      SELECT id, name, email, "class", blocked, blocked_at
      FROM app.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async lockUserForPurge(client: PoolClient, userId: string) {
    const res = await client.query(
      `
      SELECT id, name, email, "class", blocked, blocked_at, balance
      FROM app.users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId],
    );
    return res.rows?.[0] ?? null;
  }

  async markPendingDeletionConfirmed(client: PoolClient, userId: string, actorId: string) {
    await client.query(
      `
      UPDATE app.pending_deletions
      SET status = 'CONFIRMED'
      WHERE user_id = $1
        AND status = 'PENDING'
      `,
      [userId],
    );
    void actorId;
  }

  async getBalanceRequestById(db: any, id: string) {
  return db.query(
    `
      SELECT id, user_id, kind, delta, is_used, used_at, used_by
      FROM app.balance_change_requests
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );
}

  async deleteUserAllData(client: PoolClient, userId: string) {
    await client.query(`DELETE FROM app.auth_tokens WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM app.auth_credentials WHERE user_id = $1`, [userId]);

    await client.query(`DELETE FROM app.balance_change_requests WHERE user_id = $1`, [userId]);
    await client.query(`DELETE FROM app.balance_logs WHERE user_id = $1`, [userId]);

    await client.query(
      `
      DELETE FROM app.order_items
      WHERE order_id IN (
        SELECT id
        FROM app.orders
        WHERE user_id = $1
      )
      `,
      [userId],
    );

    await client.query(`DELETE FROM app.orders WHERE user_id = $1`, [userId]);

    await client.query(
      `
      DELETE FROM app.pending_registrations
      WHERE LOWER(email) = (
        SELECT LOWER(email)
        FROM app.users
        WHERE id = $1
      )
      `,
      [userId],
    );

    await client.query(
      `
      UPDATE app.pending_deletions
      SET status = 'CONFIRMED'
      WHERE user_id = $1
      `,
      [userId],
    );

    await client.query(`DELETE FROM app.users WHERE id = $1`, [userId]);
  }



  async touchLastLogin(db: Pool | PoolClient, userId: string) {
    await db.query(
      `
      UPDATE app.users
      SET last_login_at = NOW()
      WHERE id = $1
      `,
      [userId],
    );
  }
}