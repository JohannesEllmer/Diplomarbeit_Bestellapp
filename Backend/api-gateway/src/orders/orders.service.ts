import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UserRefDto } from './dto/user-ref.dto';
import { OrderResponseDto, OrderItemResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  // ---------- USER ----------
  async getMyOrders(userId: string): Promise<OrderResponseDto[]> {
    const ids = await this.db.query(
      `SELECT id FROM app.orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );

    const out: OrderResponseDto[] = [];
    for (const r of ids.rows) out.push(await this.buildOrderResponse(String(r.id)));
    return out;
  }

  async createForUser(jwtUserId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    // Sicherheit: Client darf nicht für andere User bestellen
    if (dto.user?.id && String(dto.user.id) !== String(jwtUserId)) {
      throw new ForbiddenException('CANNOT_CREATE_ORDER_FOR_OTHER_USER');
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // User existiert?
      const uRes = await client.query(
        `SELECT id FROM app.users WHERE id = $1 LIMIT 1`,
        [jwtUserId],
      );
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      // Order anlegen: created_at NOW, status open
      const orderRes = await client.query(
        `INSERT INTO app.orders (user_id, total_price, created_at, status)
         VALUES ($1, 0, NOW(), 'open')
         RETURNING id`,
        [jwtUserId],
      );
      const orderId = String(orderRes.rows[0].id);

      // Items + total berechnen aus menu_items.price
      const total = await this.insertItemsAndComputeTotal(client, orderId, jwtUserId, dto.items);

      // total_price speichern
      await client.query(
        `UPDATE app.orders SET total_price = $2 WHERE id = $1`,
        [orderId, total],
      );

      await client.query('COMMIT');
      return await this.buildOrderResponse(orderId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ---------- ADMIN ----------
  async findAll(): Promise<OrderResponseDto[]> {
    const ids = await this.db.query(`SELECT id FROM app.orders ORDER BY created_at DESC`);
    const out: OrderResponseDto[] = [];
    for (const r of ids.rows) out.push(await this.buildOrderResponse(String(r.id)));
    return out;
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    return this.buildOrderResponse(id);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    // Status update
    if (dto.status) {
      await this.db.query(`UPDATE app.orders SET status = $2 WHERE id = $1`, [id, dto.status]);
    }

    // Items update: delete + insert + total neu
    if (dto.items) {
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        const orderRes = await client.query(
          `SELECT id, user_id FROM app.orders WHERE id = $1 LIMIT 1`,
          [id],
        );
        if (orderRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

        const ownerUserId = String(orderRes.rows[0].user_id);

        await client.query(`DELETE FROM app.order_items WHERE order_id = $1`, [id]);

        const total = await this.insertItemsAndComputeTotal(client, id, ownerUserId, dto.items);

        await client.query(`UPDATE app.orders SET total_price = $2 WHERE id = $1`, [id, total]);

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return this.buildOrderResponse(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.query(`DELETE FROM app.order_items WHERE order_id = $1`, [id]);
    await this.db.query(`DELETE FROM app.orders WHERE id = $1`, [id]);
  }

  // ---------- Helpers ----------
  private async insertItemsAndComputeTotal(
    client: any,
    orderId: string,
    userId: string,
    items: CreateOrderItemDto[],
  ): Promise<number> {
    let total = 0;

    for (const it of items ?? []) {
      const mRes = await client.query(
        `SELECT id, price FROM app.menu_items WHERE id = $1 LIMIT 1`,
        [it.menuItemId],
      );
      if (mRes.rowCount === 0) throw new NotFoundException(`MENU_ITEM_NOT_FOUND:${it.menuItemId}`);

      const price = Number(mRes.rows[0].price ?? 0);
      total += price * Number(it.quantity);

      // ✅ Wichtig: order_items.user_id NOT NULL -> muss gesetzt werden
      await client.query(
        `INSERT INTO app.order_items (order_id, menu_item_id, user_id, note, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, it.menuItemId, userId, it.note ?? null, it.quantity],
      );
    }

    return total;
  }

  private async buildOrderResponse(orderId: string): Promise<OrderResponseDto> {
    // Order + User
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

    // orderCount (users hat kein order_count)
    const countRes = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1`,
      [String(o.user_id)],
    );
    const orderCount = countRes.rows?.[0]?.count ?? 0;

    const userDto: UserRefDto = {
      id: String(o.u_id),
      name: o.u_name,
      email: o.u_email,
      class: o.u_class ?? '',
      orderCount,
      balance: Number(o.u_balance ?? 0),
      blocked: !!o.u_blocked,
    };

    // Items + MenuItem
    const itemsRes = await this.db.query(
      `SELECT oi.quantity, oi.note, oi.delivered, oi.delivery_time,
              m.id as m_id, m.name as m_name, m.description as m_description,
              m.price as m_price, m.category as m_category, m.available as m_available,
              m.vegetarian as m_vegetarian, m.allergens as m_allergens
       FROM app.order_items oi
       JOIN app.menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId],
    );

    const items: OrderItemResponseDto[] = itemsRes.rows.map((r: any) => ({
      menuItem: {
        id: String(r.m_id),
        name: r.m_name,
        description: r.m_description ?? '',
        price: Number(r.m_price ?? 0),
        category: r.m_category ?? '',
        available: !!r.m_available,
        vegetarian: !!r.m_vegetarian,
        allergens: Array.isArray(r.m_allergens) ? r.m_allergens : [],
      },
      user: userDto,
      note: r.note ?? '',
      quantity: Number(r.quantity),
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
