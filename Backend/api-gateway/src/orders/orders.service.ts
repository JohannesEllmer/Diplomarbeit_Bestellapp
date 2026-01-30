import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../db';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UserRefDto } from './dto/user-ref.dto';
import { OrderItemResponseDto, OrderResponseDto } from './dto/order-response.dto';
import { AppSettingsService } from '../app-settings/app-settings.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PG_POOL) private readonly db: Pool,
    private readonly settings: AppSettingsService,
  ) {}

  async getMyOrders(userId: string): Promise<OrderResponseDto[]> {
    const ids = await this.db.query(
      `SELECT id
       FROM app.orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    const out: OrderResponseDto[] = [];
    for (const r of ids.rows ?? []) {
      out.push(await this.buildOrderResponse(String(r.id)));
    }
    return out;
  }

  async createForUser(jwtUserId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const userId = String(jwtUserId ?? '').trim();
    if (!userId) throw new BadRequestException('MISSING_USER_ID');

    const enabled = await this.settings.getOrderingEnabled();
    if (!enabled) throw new ForbiddenException('ORDERING_DISABLED');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // user exists + lock
      const uRes = await client.query(
        `SELECT id, balance
         FROM app.users
         WHERE id = $1
         FOR UPDATE`,
        [userId],
      );
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      const orderRes = await client.query(
        `INSERT INTO app.orders (user_id, total_price, created_at, status)
         VALUES ($1, 0, NOW(), 'open')
         RETURNING id`,
        [userId],
      );
      const orderId = String(orderRes.rows[0].id);

      // ✅ HARTER CHECK: Item muss im aktiven Menü sein + available=true
      const total = await this.insertItemsAndComputeTotal(client, orderId, userId, dto.items);

      // update total
      await client.query(`UPDATE app.orders SET total_price = $2 WHERE id = $1`, [orderId, total]);

      // reserved = sum open orders except current (already created)
      const reservedRes = await client.query(
        `SELECT COALESCE(SUM(total_price), 0) AS reserved
         FROM app.orders
         WHERE user_id = $1 AND status = 'open' AND id <> $2`,
        [userId, orderId],
      );
      const reserved = Number(reservedRes.rows?.[0]?.reserved ?? 0);

      const balance = Number(uRes.rows?.[0]?.balance ?? 0);
      const available = balance - reserved;

      if (available < total) {
        throw new ForbiddenException('INSUFFICIENT_FUNDS');
      }

      await client.query('COMMIT');
      return await this.buildOrderResponse(orderId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findAll(): Promise<OrderResponseDto[]> {
    const ids = await this.db.query(`SELECT id FROM app.orders ORDER BY created_at DESC`);
    const out: OrderResponseDto[] = [];
    for (const r of ids.rows ?? []) out.push(await this.buildOrderResponse(String(r.id)));
    return out;
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    return this.buildOrderResponse(String(id));
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    const orderId = String(id ?? '').trim();
    if (!orderId) throw new BadRequestException('MISSING_ORDER_ID');

    // status update
    if (dto.status) {
      await this.db.query(`UPDATE app.orders SET status = $2 WHERE id = $1`, [orderId, dto.status]);
    }

    // replace items
    if (dto.items) {
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        const orderRes = await client.query(
          `SELECT id, user_id
           FROM app.orders
           WHERE id = $1
           LIMIT 1`,
          [orderId],
        );
        if (orderRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

        const ownerUserId = String(orderRes.rows[0].user_id);

        await client.query(`DELETE FROM app.order_items WHERE order_id = $1`, [orderId]);

        // ✅ auch beim Update: im aktiven Menü + available=true
        const total = await this.insertItemsAndComputeTotal(client, orderId, ownerUserId, dto.items);

        await client.query(`UPDATE app.orders SET total_price = $2 WHERE id = $1`, [orderId, total]);

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return this.buildOrderResponse(orderId);
  }

  async remove(id: string): Promise<void> {
    const orderId = String(id ?? '').trim();
    if (!orderId) return;

    await this.db.query(`DELETE FROM app.order_items WHERE order_id = $1`, [orderId]);
    await this.db.query(`DELETE FROM app.orders WHERE id = $1`, [orderId]);
  }

  /**
   * ✅ QR-Capture: abbuchen + schließen + delivered=true
   * Erwartet Code: "Order-<uuid>"
   */
  async completeByQrCode(code: string): Promise<{ ok: boolean; orderId?: string }> {
    const c = String(code || '').trim();
    const m = /^Order-([0-9a-fA-F-]{36})$/.exec(c);
    if (!m) return { ok: false };

    const orderId = String(m[1]);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query(
        `SELECT id, user_id, total_price, status
         FROM app.orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId],
      );
      if (orderRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

      const order = orderRes.rows[0];
      if (String(order.status) === 'closed') {
        await client.query('COMMIT');
        return { ok: true, orderId };
      }

      const userRes = await client.query(
        `SELECT balance
         FROM app.users
         WHERE id = $1
         FOR UPDATE`,
        [String(order.user_id)],
      );
      if (userRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      const balance = Number(userRes.rows[0]?.balance ?? 0);
      const total = Number(order.total_price ?? 0);

      if (balance < total) {
        throw new ForbiddenException('INSUFFICIENT_FUNDS_AT_CAPTURE');
      }

      await client.query(
        `UPDATE app.users
         SET balance = balance - $2
         WHERE id = $1`,
        [String(order.user_id), total],
      );

      await client.query(`UPDATE app.orders SET status = 'closed' WHERE id = $1`, [orderId]);

      await client.query(
        `UPDATE app.order_items
         SET delivered = true
         WHERE order_id = $1`,
        [orderId],
      );

      await client.query('COMMIT');
      return { ok: true, orderId };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // -------------------------
  // internals (NEU)
  // -------------------------

  /**
   * ✅ Aktive Menü-ID holen.
   * Du nutzt bereits AppSettingsService -> typischerweise steht die selected meal plan id in einer settings Tabelle.
   *
   * WICHTIG: Falls deine Tabelle/Feld anders heißt, passe NUR diese Query an.
   */
  private async getActiveMealPlanId(client: PoolClient): Promise<string | null> {
    // Versuch 1: app.app_settings.selected_meal_plan_id
    try {
      const res = await client.query(
        `SELECT selected_meal_plan_id AS id
         FROM app.app_settings
         LIMIT 1`,
      );
      const id = String(res.rows?.[0]?.id ?? '').trim();
      return id || null;
    } catch {
      // fallback: nicht gefunden / andere Struktur
      return null;
    }
  }

  /**
   * ✅ Prüfen: menuItemId muss im aktiven Menü enthalten sein
   *
   * WICHTIG: Falls deine Relation anders heißt, passe NUR diese Query an.
   * Erwartete Relation (typisch):
   *   app.meal_plan_items(meal_plan_id, menu_item_id)
   */
  private async assertItemInActiveMenu(
    client: PoolClient,
    activeMealPlanId: string,
    menuItemId: string,
  ): Promise<void> {
    const res = await client.query(
      `SELECT 1
       FROM app.meal_plan_items mpi
       WHERE mpi.meal_plan_id = $1
         AND mpi.menu_item_id = $2
       LIMIT 1`,
      [activeMealPlanId, menuItemId],
    );

    if (res.rowCount === 0) {
      // Menü wurde gewechselt ODER Item gehört nicht zum aktiven Menü
      throw new ForbiddenException(`MENU_ITEM_NOT_IN_ACTIVE_MENU:${menuItemId}`);
    }
  }

  /**
   * ✅ Kern: hier wird jetzt serverseitig verhindert, dass
   * - alte Warenkorb-Items bestellt werden (Menüwechsel)
   * - unavailable Items bestellt werden
   */
  private async insertItemsAndComputeTotal(
    client: PoolClient,
    orderId: string,
    userId: string,
    items: CreateOrderItemDto[],
  ): Promise<number> {
    let total = 0;

    // ✅ aktive Menü-ID einmal laden (wenn vorhanden)
    const activeMealPlanId = await this.getActiveMealPlanId(client);

    for (const it of items ?? []) {
      const menuItemId = String(it.menuItemId ?? '').trim();
      if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

      const qty = Number(it.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('INVALID_QUANTITY');

      // ✅ Menüwechsel verhindern: wenn activeMealPlanId existiert -> Item muss drin sein
      if (activeMealPlanId) {
        await this.assertItemInActiveMenu(client, activeMealPlanId, menuItemId);
      }

      // ✅ Item existiert + available check (wichtig für "Inhaber setzt Gericht unavailable")
      const mRes = await client.query(
        `SELECT id, price, available
         FROM app.menu_items
         WHERE id = $1
         LIMIT 1`,
        [menuItemId],
      );
      if (mRes.rowCount === 0) throw new NotFoundException(`MENU_ITEM_NOT_FOUND:${menuItemId}`);

      const available = mRes.rows[0]?.available;
      if (available === false) {
        throw new ForbiddenException(`MENU_ITEM_NOT_AVAILABLE:${menuItemId}`);
      }

      const price = Number(mRes.rows[0].price ?? 0);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('INVALID_PRICE');

      total += price * qty;

      const deliveryTime = it.deliveryTime ? new Date(it.deliveryTime) : null;

      await client.query(
        `INSERT INTO app.order_items
          (order_id, menu_item_id, user_id, note, quantity, delivery_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, menuItemId, userId, it.note ?? null, qty, deliveryTime],
      );
    }

    return total;
  }

  private async buildOrderResponse(orderId: string): Promise<OrderResponseDto> {
    const orderRes = await this.db.query(
      `SELECT o.id, o.user_id, o.total_price, o.created_at, o.status, o.qr_code_url,
              u.id as u_id, u.name as u_name, u.email as u_email, u.class as u_class,
              u.balance as u_balance, u.blocked as u_blocked
       FROM app.orders o
       JOIN app.users u ON u.id = o.user_id
       WHERE o.id = $1
       LIMIT 1`,
      [orderId],
    );
    if (orderRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

    const o = orderRes.rows[0];

    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM app.orders
       WHERE user_id = $1`,
      [String(o.user_id)],
    );
    const orderCount = Number(countRes.rows?.[0]?.count ?? 0);

    const userDto: UserRefDto = {
      id: String(o.u_id),
      name: o.u_name,
      email: o.u_email,
      class: o.u_class ?? '',
      orderCount,
      balance: Number(o.u_balance ?? 0),
      blocked: !!o.u_blocked,
    };

    const itemsRes = await this.db.query(
      `SELECT oi.quantity, oi.note, oi.delivered, oi.delivery_time,
              m.id as m_id, m.name as m_name, m.description as m_description,
              m.price as m_price, m.category as m_category, m.available as m_available,
              m.vegetarian as m_vegetarian, m.allergens as m_allergens,
              m.drink as m_drink, m.dessert as m_dessert
       FROM app.order_items oi
       JOIN app.menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId],
    );

    const items: OrderItemResponseDto[] = (itemsRes.rows ?? []).map((r: any) => ({
      menuItem: {
        id: String(r.m_id),
        name: r.m_name ?? '',
        description: r.m_description ?? '',
        price: Number(r.m_price ?? 0),
        category: r.m_category ?? '',
        available: !!r.m_available,
        vegetarian: !!r.m_vegetarian,
        allergens: Array.isArray(r.m_allergens) ? r.m_allergens : [],
        drink: r.m_drink ?? undefined,
        dessert: r.m_dessert ?? undefined,
      },
      user: userDto,
      note: r.note ?? '',
      quantity: Number(r.quantity ?? 0),
      delivered: !!r.delivered,
      deliveryTime: r.delivery_time ? new Date(r.delivery_time).toISOString() : undefined,
    }));

    return {
      id: String(o.id),
      user: userDto,
      items,
      totalPrice: Number(o.total_price ?? 0),
      createdAt: new Date(o.created_at).toISOString(),
      status: o.status,
      qrCodeUrl: o.qr_code_url ?? undefined,
    };
  }
}
