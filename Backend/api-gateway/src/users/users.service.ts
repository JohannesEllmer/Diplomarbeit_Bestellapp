import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepo } from './users.repo';
import { isClassExpired } from './class-expirey';

@Injectable()
export class UsersService {
  constructor(
    @Inject(PG_POOL) private readonly db: Pool,
    private readonly repo: UsersRepo,
  ) {}

  // 400 Tage Policy erzwingen
  async enforceClassPolicy(userId: string) {
    const id = String(userId ?? '').trim();
    if (!id) return null;

    const u = await this.repo.getPolicyRow(this.db, id);
    if (!u) return null;

    if (!isClassExpired(u.class_updated_at)) {
      return { id: String(u.id), blocked: !!u.blocked, class: u.class ?? null };
    }

    const upd = await this.repo.expireClassAndBlock(this.db, id);
    if (!upd) return null;

    return { id: String(upd.id), blocked: !!upd.blocked, class: upd.class ?? null };
  }

  async updateMyClass(userId: string, newClass: string) {
    const id = String(userId ?? '').trim();
    const cls = String(newClass ?? '').trim();
    if (!id) throw new NotFoundException('USER_NOT_FOUND');
    if (!cls) throw new ForbiddenException('CLASS_REQUIRED');

    const res = await this.repo.updateMyClass(this.db, id, cls);
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

  // QR-Request: Add
  async createBalanceAddRequest(userId: string, delta: number) {
    await this.enforceClassPolicy(userId);

    const d = Number(delta);
    if (!isFinite(d) || d <= 0) throw new ForbiddenException('DELTA_MUST_BE_POSITIVE');

    const u = await this.repo.getUserForBalanceRequests(this.db, userId);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');
    if (u.blocked) throw new ForbiddenException('USER_BLOCKED');

    const id = await this.repo.insertBalanceAddRequest(this.db, userId, d);
    const code = `BalanceReq-${id}`;
    return { id, code, qrCodeUrl: this.generateQrCode(code) };
  }

  // QR-Request: Flush
  async createBalanceFlushRequest(userId: string) {
    await this.enforceClassPolicy(userId);

    const u = await this.repo.getUserForBalanceRequests(this.db, userId);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');
    if (u.blocked) throw new ForbiddenException('USER_BLOCKED');

    const balance = Number(u.balance ?? 0);
    if (balance <= 0) throw new ForbiddenException('BALANCE_ALREADY_ZERO');

    const reserved = await this.repo.sumOpenOrdersTotal(this.db, userId);
    if (reserved > 0) throw new ForbiddenException('CANNOT_FLUSH_WITH_OPEN_ORDERS');

    const id = await this.repo.insertBalanceFlushRequest(this.db, userId);
    const code = `BalanceReq-${id}`;
    return { id, code, qrCodeUrl: this.generateQrCode(code) };
  }

  // Admin scannt QR → Guthaben ändern + loggen
  async confirmBalanceRequestByQr(code: string, actorId: string) {
    const m = /^BalanceReq-([0-9a-fA-F-]{36})$/.exec(String(code || '').trim());
    if (!m) return { ok: false, error: 'INVALID_QR' };

    const reqId = m[1];
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const rRes = await this.repo.lockBalanceRequest(client, reqId);
      if (rRes.rowCount === 0) throw new NotFoundException('REQUEST_NOT_FOUND');

      const reqRow = rRes.rows[0];
      if (reqRow.is_used) {
        await client.query('COMMIT');
        return { ok: true, alreadyUsed: true };
      }

      const userId = String(reqRow.user_id);

      const uRes = await this.repo.lockUserForBalanceUpdate(client, userId);
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
        await this.repo.setUserBalance(client, userId, newBalance);
      } else if (reqRow.kind === 'flush') {
        newBalance = 0;
        deltaToApply = oldBalance > 0 ? -oldBalance : 0;
        reason = 'BALANCE_FLUSH_CONFIRMED';
        await this.repo.setUserBalance(client, userId, 0);
      } else {
        throw new ForbiddenException('INVALID_KIND');
      }

      await this.repo.insertBalanceLog(client, {
        userId,
        delta: deltaToApply,
        balanceAfter: newBalance,
        reason,
        refId: String(reqId),
        actor: `admin:${actorId}`,
      });

      await this.repo.markRequestUsed(client, reqId, String(actorId));

      await client.query('COMMIT');
      return { ok: true, userId, delta: deltaToApply, balanceAfter: newBalance };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Gemeinsame Delete-Checks (für me und admin)
  private async assertDeletable(userId: string) {
    const u = await this.repo.getUserForBalanceRequests(this.db, userId);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');

    const balance = Number(u.balance ?? 0);
    if (balance !== 0) throw new ForbiddenException('BALANCE_NOT_ZERO');

    const reserved = await this.repo.sumOpenOrdersTotal(this.db, userId);
    if (reserved > 0) throw new ForbiddenException('HAS_OPEN_ORDERS');
  }

  // Account löschen: nur wenn balance=0 UND reserved=0
  async deleteAccountIfAllowed(userId: string) {
    await this.enforceClassPolicy(userId);
    await this.assertDeletable(userId);
    await this.repo.deleteByUserId(this.db, userId);
    return { ok: true };
  }

  // Admin: User löschen (nutzt gleiche Checks)
  async remove(id: string) {
    await this.assertDeletable(id);
    await this.repo.deleteByUserId(this.db, id);
  }

  // updateBalanceDelta (Admin/Debug)
  async updateBalanceDelta(id: string, delta: number) {
    const userId = String(id ?? '').trim();
    const d = Number(delta);
    if (!userId) throw new BadRequestException('USER_NOT_FOUND');
    if (!Number.isFinite(d)) throw new BadRequestException('INVALID_DELTA');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const uRes = await this.repo.lockUserBalanceOnly(client, userId);
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      const oldBal = Number(uRes.rows[0]?.balance ?? 0);
      const newBal = oldBal + d;

      await client.query(`UPDATE app.users SET balance = $2 WHERE id = $1`, [userId, newBal]);
      await this.repo.insertDirectBalanceLog(client, { userId, delta: d, balanceAfter: newBal });

      await client.query('COMMIT');
      return { ok: true, balance: newBal };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Header
  async getMyHeader(jwtUser: any) {
    const userId = String(jwtUser?.id ?? jwtUser?.sub);
    await this.enforceClassPolicy(userId);

    const u = await this.repo.getUserBasic(this.db, userId);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');

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

  // Profil + Guthaben + reserved + available
  async getMyProfile(userId: string) {
    await this.enforceClassPolicy(userId);

    const u = await this.repo.getUserBasic(this.db, userId);
    if (!u) throw new NotFoundException('USER_NOT_FOUND');

    const reserved = await this.repo.sumOpenOrdersTotal(this.db, userId);
    const balance = Number(u.balance ?? 0);

    return {
      user: {
        id: String(u.id),
        name: u.name,
        email: u.email,
        class: u.class ?? '',
        blocked: !!u.blocked,
      },
      balance,
      reserved,
      available: balance - reserved,
      orderCount: await this.repo.countOrders(this.db, userId),
    };
  }

  // User-Page: Activity/Logs
  async getMyActivity(userId: string) {
    await this.enforceClassPolicy(userId);

    const ordersRes = await this.repo.listMyOrdersForActivity(this.db, userId);
    const logsRes = await this.repo.listMyBalanceLogs(this.db, userId);

    return {
      orders: (ordersRes.rows ?? []).map((r: any) => ({
        id: String(r.id),
        totalPrice: Number(r.total_price ?? 0),
        createdAt: new Date(r.created_at).toISOString(),
        status: String(r.status),
      })),
      balanceLogs: (logsRes.rows ?? []).map((r: any) => ({
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

  // ADMIN: Alle User
  async findAll() {
    const res = await this.repo.listUsersAdmin(this.db);
    return (res.rows ?? []).map((r: any) => ({
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
    const res = await this.repo.getUserAdmin(this.db, String(id));
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

  // ADMIN: User updaten (dynamic SET bleibt im Service, SQL-Ausführung im Repo)
  async update(id: string, dto: Partial<CreateUserDto>) {
    const userId = String(id ?? '').trim();
    if (!userId) throw new NotFoundException('USER_NOT_FOUND');

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

    if ((dto as any).class !== undefined) {
      setIf(`"class"`, (dto as any).class);
      fields.push(`class_updated_at = NOW()`);
      fields.push(`blocked = false`);
    }

    setIf('blocked', (dto as any).blocked);
    setIf('role', (dto as any).role);

    if (!fields.length) return this.findOne(userId);

    values.push(userId);
    await this.repo.updateAdminDynamic(this.db, fields.join(', '), values);

    return this.findOne(userId);
  }

  async create(dto: CreateUserDto) {
    const cls = String((dto as any).class ?? '').trim();
    const id = await this.repo.insertUser(this.db, {
      name: dto.name,
      email: dto.email,
      cls: cls ? cls : null,
      role: String((dto as any).role ?? 'USER'),
    });
    return this.findOne(id);
  }

  // Utility: QR URL
  private generateQrCode(data: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
  }
}
