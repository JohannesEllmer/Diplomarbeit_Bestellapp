import type { Pool, PoolClient } from 'pg';

export type Db = Pool | PoolClient;

export class UsersRepo {
 
  async getPolicyRow(db: Db, userId: string) {
    const r = await db.query(
      `SELECT id, blocked, "class", class_updated_at
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    return r.rowCount ? r.rows[0] : null;
  }

  async expireClassAndBlock(db: Db, userId: string) {
    const r = await db.query(
      `UPDATE app.users
       SET "class" = NULL,
           class_updated_at = NULL,
           blocked = true
       WHERE id = $1
       RETURNING id, blocked, "class", class_updated_at`,
      [userId],
    );
    return r.rowCount ? r.rows[0] : null;
  }

  //basic reads 
  async getUserForClassUpdate(db: Db, userId: string) {
    return db.query(
      `UPDATE app.users
       SET "class" = $2,
           class_updated_at = NOW(),
           blocked = false
       WHERE id = $1
       RETURNING id, name, email, "class", class_updated_at, balance, blocked, role`,
      [userId, null], // caller ersetzt $2 per values (siehe Service)
    );
  }

  async updateMyClass(db: Db, userId: string, cls: string) {
    const r = await db.query(
      `UPDATE app.users
       SET "class" = $2,
           class_updated_at = NOW(),
           blocked = false
       WHERE id = $1
       RETURNING id, name, email, "class", class_updated_at, balance, blocked, role`,
      [userId, cls],
    );
    return r;
  }

  async getUserBasic(db: Db, userId: string) {
    const r = await db.query(
      `SELECT id, name, email, "class", balance, blocked, role
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    return r.rowCount ? r.rows[0] : null;
  }

  async getUserForBalanceRequests(db: Db, userId: string) {
    const r = await db.query(
      `SELECT id, balance, blocked
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    return r.rowCount ? r.rows[0] : null;
  }

  async sumOpenOrdersTotal(db: Db, userId: string) {
    const r = await db.query(
      `SELECT COALESCE(SUM(total_price), 0) AS reserved
       FROM app.orders
       WHERE user_id = $1 AND status = 'open'`,
      [userId],
    );
    return Number(r.rows?.[0]?.reserved ?? 0);
  }

  async countOrders(db: Db, userId: string) {
    const r = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM app.orders
       WHERE user_id = $1`,
      [userId],
    );
    return Number(r.rows?.[0]?.count ?? 0);
  }

  //balance requests 
  async insertBalanceAddRequest(db: Db, userId: string, delta: number) {
    const r = await db.query(
      `INSERT INTO app.balance_change_requests (user_id, kind, delta)
       VALUES ($1, 'add', $2)
       RETURNING id`,
      [userId, delta],
    );
    return String(r.rows[0].id);
  }

  async insertBalanceFlushRequest(db: Db, userId: string) {
    const r = await db.query(
      `INSERT INTO app.balance_change_requests (user_id, kind, delta)
       VALUES ($1, 'flush', NULL)
       RETURNING id`,
      [userId],
    );
    return String(r.rows[0].id);
  }

  async lockBalanceRequest(db: Db, reqId: string) {
    return db.query(
      `SELECT id, user_id, kind, delta, is_used
       FROM app.balance_change_requests
       WHERE id = $1
       FOR UPDATE`,
      [reqId],
    );
  }

  async lockUserForBalanceUpdate(db: Db, userId: string) {
    return db.query(
      `SELECT id, balance, blocked
       FROM app.users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );
  }

  async setUserBalance(db: Db, userId: string, balance: number) {
    await db.query(`UPDATE app.users SET balance = $2 WHERE id = $1`, [userId, balance]);
  }

  async insertBalanceLog(db: Db, row: {
    userId: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    refId: string;
    actor: string;
  }) {
    await db.query(
      `INSERT INTO app.balance_logs (user_id, delta, balance_after, reason, ref_type, ref_id, actor)
       VALUES ($1, $2, $3, $4, 'balance_request', $5, $6)`,
      [row.userId, row.delta, row.balanceAfter, row.reason, row.refId, row.actor],
    );
  }

  async markRequestUsed(db: Db, reqId: string, actorId: string) {
    await db.query(
      `UPDATE app.balance_change_requests
       SET is_used = true, used_at = now(), used_by = $2
       WHERE id = $1`,
      [reqId, actorId],
    );
  }

  //activity 
  async listMyOrdersForActivity(db: Db, userId: string) {
    return db.query(
      `SELECT id, total_price, created_at, status
       FROM app.orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
  }

  async listMyBalanceLogs(db: Db, userId: string) {
    return db.query(
      `SELECT id, delta, balance_after, reason, ref_type, ref_id, actor, created_at
       FROM app.balance_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId],
    );
  }

  // admin list/detail
  async listUsersAdmin(db: Db) {
    return db.query(
      `SELECT
         u.id, u.name, u.email, u."class", u.balance, u.blocked, u.role,
         COALESCE(o.cnt, 0)::int AS order_count
       FROM app.users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS cnt
         FROM app.orders
         GROUP BY user_id
       ) o ON o.user_id = u.id
       ORDER BY u.name ASC`,
    );
  }

  async getUserAdmin(db: Db, id: string) {
    return db.query(
      `SELECT
         u.id, u.name, u.email, u."class", u.balance, u.blocked, u.role,
         COALESCE(o.cnt, 0)::int AS order_count
       FROM app.users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS cnt
         FROM app.orders
         GROUP BY user_id
       ) o ON o.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [id],
    );
  }

  async updateAdminDynamic(db: Db, sqlSet: string, values: any[]) {
    await db.query(`UPDATE app.users SET ${sqlSet} WHERE id = $${values.length}`, values);
  }

  async insertUser(db: Db, row: { name: string; email: string; cls: string | null; role: string }) {
    const hasClass = !!row.cls;
    const r = await db.query(
      `INSERT INTO app.users (name, email, "class", class_updated_at, blocked, balance, role)
       VALUES ($1, $2, $3, ${hasClass ? 'NOW()' : 'NULL'}, false, 0, COALESCE($4, 'USER'))
       RETURNING id`,
      [row.name, row.email, row.cls, row.role],
    );
    return String(r.rows[0].id);
  }

  //delete
  async deleteByUserId(db: Db, userId: string) {
    await db.query(`DELETE FROM app.balance_change_requests WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM app.balance_logs WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM app.order_items WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM app.orders WHERE user_id = $1`, [userId]);
    await db.query(`DELETE FROM app.users WHERE id = $1`, [userId]);
  }

  async lockUserBalanceOnly(db: Db, userId: string) {
    return db.query(`SELECT id, balance FROM app.users WHERE id=$1 FOR UPDATE`, [userId]);
  }

  async insertDirectBalanceLog(db: Db, row: { userId: string; delta: number; balanceAfter: number }) {
    await db.query(
      `INSERT INTO app.balance_logs (user_id, delta, balance_after, reason, actor)
       VALUES ($1, $2, $3, 'BALANCE_DELTA_DIRECT', 'system')`,
      [row.userId, row.delta, row.balanceAfter],
    );
  }
}
