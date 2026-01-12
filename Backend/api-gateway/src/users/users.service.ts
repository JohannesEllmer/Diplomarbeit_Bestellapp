import { Inject, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateUserDto } from './dto/create-user.dto';
import { isClassExpired } from './class-expirey';

type DbUserPolicyRow = {
  id: string;
  blocked: boolean;
  class: string | null;
  class_updated_at: any;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  // --------------------------------------------
  // ✅ 400 Tage Policy erzwingen
  // --------------------------------------------
  async enforceClassPolicy(userId: string): Promise<{ id: string; blocked: boolean; class: string | null } | null> {
    const id = String(userId ?? '').trim();
    if (!id) return null;

    const res = await this.db.query<DbUserPolicyRow>(
      `SELECT id, blocked, "class", class_updated_at
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) return null;

    const u = res.rows[0];

    // wenn schon blocked, lassen wir es so (blocked bleibt blocked)
    // aber wir können trotzdem class löschen, falls expired
    const expired = isClassExpired(u.class_updated_at);

    if (!expired) {
      return { id: String(u.id), blocked: !!u.blocked, class: u.class ?? null };
    }

    // abgelaufen: class entfernen + blocken
    const upd = await this.db.query<DbUserPolicyRow>(
      `UPDATE app.users
       SET "class" = NULL,
           class_updated_at = NULL,
           blocked = true
       WHERE id = $1
       RETURNING id, blocked, "class", class_updated_at`,
      [id],
    );

    const uu = upd.rows[0];
    return { id: String(uu.id), blocked: !!uu.blocked, class: uu.class ?? null };
  }

  async updateMyClass(userId: string, newClass: string) {
    const id = String(userId ?? '').trim();
    const cls = String(newClass ?? '').trim();

    if (!id) throw new NotFoundException('USER_NOT_FOUND');
    if (!cls) throw new ForbiddenException('CLASS_REQUIRED');

    const res = await this.db.query(
      `UPDATE app.users
       SET "class" = $2,
           class_updated_at = NOW(),
           blocked = false
       WHERE id = $1
       RETURNING id, name, email, "class", class_updated_at, balance, blocked, role`,
      [id, cls],
    );

    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    const u = res.rows[0];

    return {
      ok: true,
      user: {
        id: String(u.id),
        name: u.name,
        email: u.email,
        class: u.class ?? '',
        blocked: !!u.blocked,
        role: u.role ?? 'USER',
      },
    };
  }

  // ---------------------------
  // ✅ QR-Request: Add
  // ---------------------------
  async createBalanceAddRequest(userId: string, delta: number) {
    // policy vor jeder action erzwingen
    await this.enforceClassPolicy(userId);

    const d = Number(delta);
    if (!isFinite(d) || d <= 0) throw new ForbiddenException('DELTA_MUST_BE_POSITIVE');

    const uRes = await this.db.query(`SELECT id, blocked FROM app.users WHERE id = $1 LIMIT 1`, [userId]);
    if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    if (uRes.rows[0]?.blocked) throw new ForbiddenException('USER_BLOCKED');

    const res = await this.db.query(
      `INSERT INTO app.balance_change_requests (user_id, kind, delta)
       VALUES ($1, 'add', $2)
       RETURNING id`,
      [userId, d],
    );

    const id = String(res.rows[0].id);
    const code = `BalanceReq-${id}`;
    const qrCodeUrl = this.generateQrCode(code);

    return { id, code, qrCodeUrl };
  }

  // ---------------------------
  // ✅ QR-Request: Flush
  // ---------------------------
  async createBalanceFlushRequest(userId: string) {
    await this.enforceClassPolicy(userId);

    const uRes = await this.db.query(
      `SELECT id, balance, blocked FROM app.users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    if (uRes.rows[0]?.blocked) throw new ForbiddenException('USER_BLOCKED');

    const balance = Number(uRes.rows[0]?.balance ?? 0);
    if (balance <= 0) throw new ForbiddenException('BALANCE_ALREADY_ZERO');

    const reservedRes = await this.db.query(
      `SELECT COALESCE(SUM(total_price), 0) AS reserved
       FROM app.orders
       WHERE user_id = $1 AND status = 'open'`,
      [userId],
    );
    const reserved = Number(reservedRes.rows?.[0]?.reserved ?? 0);
    if (reserved > 0) throw new ForbiddenException('CANNOT_FLUSH_WITH_OPEN_ORDERS');

    const res = await this.db.query(
      `INSERT INTO app.balance_change_requests (user_id, kind, delta)
       VALUES ($1, 'flush', NULL)
       RETURNING id`,
      [userId],
    );

    const id = String(res.rows[0].id);
    const code = `BalanceReq-${id}`;
    const qrCodeUrl = this.generateQrCode(code);

    return { id, code, qrCodeUrl };
  }

  // ---------------------------
  // ✅ Admin scannt QR → Guthaben ändern + loggen
  // ---------------------------
  async confirmBalanceRequestByQr(code: string, actorId: string) {
    const c = (code || '').trim();
    const m = /^BalanceReq-([0-9a-fA-F-]{36})$/.exec(c);
    if (!m) return { ok: false, error: 'INVALID_QR' };

    const reqId = m[1];

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const rRes = await client.query(
        `SELECT id, user_id, kind, delta, is_used
         FROM app.balance_change_requests
         WHERE id = $1
         FOR UPDATE`,
        [reqId],
      );
      if (rRes.rowCount === 0) throw new NotFoundException('REQUEST_NOT_FOUND');

      const reqRow = rRes.rows[0];
      if (reqRow.is_used) {
        await client.query('COMMIT');
        return { ok: true, alreadyUsed: true };
      }

      const userId = String(reqRow.user_id);

      // policy auch hier erzwingen (optional)
      // (Admin kann trotzdem bestätigen, aber blocked soll verhindern)
      const uRes = await client.query(
        `SELECT id, balance, blocked
         FROM app.users
         WHERE id = $1
         FOR UPDATE`,
        [userId],
      );
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
      if (uRes.rows[0]?.blocked) throw new ForbiddenException('USER_BLOCKED');

      const oldBalance = Number(uRes.rows[0]?.balance ?? 0);

      let deltaToApply = 0;
      let newBalance = oldBalance;
      let reason = '';

      if (reqRow.kind === 'add') {
        deltaToApply = Number(reqRow.delta ?? 0);
        if (!isFinite(deltaToApply) || deltaToApply <= 0) throw new ForbiddenException('INVALID_DELTA');

        newBalance = oldBalance + deltaToApply;
        reason = 'BALANCE_ADD_CONFIRMED';

        await client.query(
          `UPDATE app.users SET balance = $2 WHERE id = $1`,
          [userId, newBalance],
        );
      } else if (reqRow.kind === 'flush') {
        newBalance = 0;
        deltaToApply = oldBalance > 0 ? -oldBalance : 0;
        reason = 'BALANCE_FLUSH_CONFIRMED';

        await client.query(`UPDATE app.users SET balance = 0 WHERE id = $1`, [userId]);
      } else {
        throw new ForbiddenException('INVALID_KIND');
      }

      await client.query(
        `INSERT INTO app.balance_logs (user_id, delta, balance_after, reason, ref_type, ref_id, actor)
         VALUES ($1, $2, $3, $4, 'balance_request', $5, $6)`,
        [userId, deltaToApply, newBalance, reason, String(reqId), `admin:${actorId}`],
      );

      await client.query(
        `UPDATE app.balance_change_requests
         SET is_used = true, used_at = now(), used_by = $2
         WHERE id = $1`,
        [reqId, String(actorId)],
      );

      await client.query('COMMIT');
      return { ok: true, userId, delta: deltaToApply, balanceAfter: newBalance };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ---------------------------
  // ✅ Account löschen: nur wenn balance=0 UND reserved=0
  // ---------------------------
  async deleteAccountIfAllowed(userId: string) {
    await this.enforceClassPolicy(userId);

    const uRes = await this.db.query(
      `SELECT id, balance FROM app.users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const balance = Number(uRes.rows[0]?.balance ?? 0);
    if (balance !== 0) throw new ForbiddenException('BALANCE_NOT_ZERO');

    const reservedRes = await this.db.query(
      `SELECT COALESCE(SUM(total_price), 0) AS reserved
       FROM app.orders
       WHERE user_id = $1 AND status = 'open'`,
      [userId],
    );
    const reserved = Number(reservedRes.rows?.[0]?.reserved ?? 0);
    if (reserved > 0) throw new ForbiddenException('HAS_OPEN_ORDERS');

    await this.db.query(`DELETE FROM app.balance_change_requests WHERE user_id = $1`, [userId]);
    await this.db.query(`DELETE FROM app.balance_logs WHERE user_id = $1`, [userId]);
    await this.db.query(`DELETE FROM app.order_items WHERE user_id = $1`, [userId]);
    await this.db.query(`DELETE FROM app.orders WHERE user_id = $1`, [userId]);
    await this.db.query(`DELETE FROM app.users WHERE id = $1`, [userId]);

    return { ok: true };
  }

  // ---------------------------
  // Utility: QR URL
  // ---------------------------
  private generateQrCode(data: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  }

  // ---------------------------
  // ✅ updateBalanceDelta (dein Code)
  // ---------------------------
  async updateBalanceDelta(id: string, delta: number) {
    const d = Number(delta);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const uRes = await client.query(
        `SELECT id, balance FROM app.users WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      const oldBal = Number(uRes.rows[0]?.balance ?? 0);
      const newBal = oldBal + d;

      await client.query(`UPDATE app.users SET balance = $2 WHERE id = $1`, [id, newBal]);

      await client.query(
        `INSERT INTO app.balance_logs (user_id, delta, balance_after, reason, actor)
         VALUES ($1, $2, $3, 'BALANCE_DELTA_DIRECT', 'system')`,
        [id, d, newBal],
      );

      await client.query('COMMIT');
      return { ok: true, balance: newBal };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ----------------------------------------------------
  // Header
  // ----------------------------------------------------
  async getMyHeader(jwtUser: any) {
    const userId = String(jwtUser?.id ?? jwtUser?.sub);

    // ✅ Policy erzwingen bevor Header zurückgegeben wird
    await this.enforceClassPolicy(userId);

    const res = await this.db.query(
      `SELECT id, name, email, "class", balance, blocked, role
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const u = res.rows[0];
    return {
      id: String(u.id),
      name: u.name,
      email: u.email,
      class: u.class ?? '',
      balance: Number(u.balance ?? 0),
      blocked: !!u.blocked,
      role: u.role ?? 'USER',
    };
  }

  // ---------------------------
  // ✅ User-Page: Profil + Guthaben + reserved + available
  // ---------------------------
  async getMyProfile(userId: string) {
    await this.enforceClassPolicy(userId);

    const uRes = await this.db.query(
      `SELECT id, name, email, "class", balance, blocked
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );
    if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const user = uRes.rows[0];

    const reservedRes = await this.db.query(
      `SELECT COALESCE(SUM(total_price), 0) AS reserved
       FROM app.orders
       WHERE user_id = $1 AND status = 'open'`,
      [userId],
    );
    const reserved = Number(reservedRes.rows?.[0]?.reserved ?? 0);
    const balance = Number(user.balance ?? 0);
    const available = balance - reserved;

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM app.orders WHERE user_id = $1`,
      [userId],
    );

    return {
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        class: user.class ?? '',
        blocked: !!user.blocked,
      },
      balance,
      reserved,
      available,
      orderCount: countRes.rows?.[0]?.count ?? 0,
    };
  }

  // ---------------------------
  // ✅ User-Page: Activity/Logs
  // ---------------------------
  async getMyActivity(userId: string) {
    await this.enforceClassPolicy(userId);

    const ordersRes = await this.db.query(
      `SELECT id, total_price, created_at, status
       FROM app.orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );

    const logsRes = await this.db.query(
      `SELECT id, delta, balance_after, reason, ref_type, ref_id, actor, created_at
       FROM app.balance_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId],
    );

    return {
      orders: ordersRes.rows.map(r => ({
        id: String(r.id),
        totalPrice: Number(r.total_price ?? 0),
        createdAt: new Date(r.created_at).toISOString(),
        status: String(r.status),
      })),
      balanceLogs: logsRes.rows.map(r => ({
        id: Number(r.id),
        delta: Number(r.delta ?? 0),
        balanceAfter: Number(r.balance_after ?? 0),
        reason: String(r.reason),
        refType: r.ref_type ?? undefined,
        refId: r.ref_id ?? undefined,
        actor: r.actor ?? undefined,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  }

  // ---------------------------
  // ✅ ADMIN: Alle User
  // ---------------------------
  async findAll() {
    const res = await this.db.query(
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

    return res.rows.map(r => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      class: r.class ?? '',
      orderCount: Number(r.order_count ?? 0),
      balance: Number(r.balance ?? 0),
      blocked: !!r.blocked,
      role: r.role ?? 'USER',
    }));
  }

  async findOne(id: string) {
    const res = await this.db.query(
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
    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const r = res.rows[0];
    return {
      id: String(r.id),
      name: r.name,
      email: r.email,
      class: r.class ?? '',
      orderCount: Number(r.order_count ?? 0),
      balance: Number(r.balance ?? 0),
      blocked: !!r.blocked,
      role: r.role ?? 'USER',
    };
  }

  // ---------------------------
  // ✅ ADMIN: User updaten
  //  - wenn class geändert wird -> class_updated_at=NOW() und blocked=false
  // ---------------------------
  async update(id: string, dto: Partial<CreateUserDto>) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const setIf = (col: string, val: any) => {
      if (val === undefined) return;
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    };

    setIf('name', dto.name);
    setIf('email', dto.email);

    // class ist keyword -> quoted
    if ((dto as any).class !== undefined) {
      setIf(`"class"`, (dto as any).class);
      // ✅ sobald admin class setzt: timestamp + unblock
      fields.push(`class_updated_at = NOW()`);
      fields.push(`blocked = false`);
    }

    setIf('blocked', (dto as any).blocked);
    setIf('role', (dto as any).role);

    if (!fields.length) return this.findOne(id);

    values.push(id);
    await this.db.query(`UPDATE app.users SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    return this.findOne(id);
  }

  // ---------------------------
  // ✅ ADMIN: User löschen
  // ---------------------------
  async remove(id: string) {
    const uRes = await this.db.query(
      `SELECT id, balance FROM app.users WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const balance = Number(uRes.rows[0]?.balance ?? 0);
    if (balance !== 0) throw new ForbiddenException('NON_ZERO_BALANCE');

    const reservedRes = await this.db.query(
      `SELECT COALESCE(SUM(total_price), 0) AS reserved
       FROM app.orders
       WHERE user_id = $1 AND status = 'open'`,
      [id],
    );
    const reserved = Number(reservedRes.rows?.[0]?.reserved ?? 0);
    if (reserved > 0) throw new ForbiddenException('HAS_OPEN_ORDERS');

    await this.db.query(`DELETE FROM app.balance_change_requests WHERE user_id = $1`, [id]);
    await this.db.query(`DELETE FROM app.balance_logs WHERE user_id = $1`, [id]);
    await this.db.query(`DELETE FROM app.order_items WHERE user_id = $1`, [id]);
    await this.db.query(`DELETE FROM app.orders WHERE user_id = $1`, [id]);
    await this.db.query(`DELETE FROM app.users WHERE id = $1`, [id]);
  }

  // ---------------------------
  // (optional) Create
  //  - wenn class gesetzt -> class_updated_at=NOW()
  // ---------------------------
  async create(dto: CreateUserDto) {
    const cls = String((dto as any).class ?? '').trim();
    const hasClass = !!cls;

    const res = await this.db.query(
      `INSERT INTO app.users (name, email, "class", class_updated_at, blocked, balance, role)
       VALUES ($1, $2, $3, ${hasClass ? 'NOW()' : 'NULL'}, false, 0, COALESCE($4, 'USER'))
       RETURNING id`,
      [dto.name, dto.email, hasClass ? cls : null, (dto as any).role ?? 'USER'],
    );

    return this.findOne(String(res.rows[0].id));
  }
}
