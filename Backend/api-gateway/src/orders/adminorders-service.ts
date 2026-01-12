import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';

import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PG_POOL } from '../db';

import { NotificationsService } from '../notifications/notification.service';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly orders: OrdersService,
    @Inject(PG_POOL) private readonly db: Pool,
    private readonly notifications: NotificationsService, 
  ) {}

  findAll() {
    return this.orders.findAll();
  }

  findOne(id: string) {
    return this.orders.findOne(id);
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  remove(id: string) {
    return this.orders.remove(id);
  }

  private parseOrderIdFromCode(code: string): string {
    const c = String(code || '').trim();
    const m = /^Order-([0-9a-fA-F-]{36})$/.exec(c);
    if (!m) throw new BadRequestException('INVALID_QR_CODE');
    return m[1];
  }

  async completeOrderByQr(code: string) {
    const orderId = this.parseOrderIdFromCode(code);

    const client = await this.db.connect();
    let userId = '';
    try {
      await client.query('BEGIN');

      const ord = await client.query(
        `UPDATE app.orders
         SET status = 'closed'
         WHERE id = $1
         RETURNING id, user_id, total_price, created_at, status, qr_code_url`,
        [orderId],
      );

      if ((ord.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        throw new NotFoundException('ORDER_NOT_FOUND');
      }

      userId = String(ord.rows[0].user_id);

      await client.query(
        `UPDATE app.order_items
         SET delivered = TRUE,
             delivery_time = COALESCE(delivery_time, now())
         WHERE order_id = $1`,
        [orderId],
      );

      await client.query('COMMIT');

      await this.notifications.orderCompleted(userId, orderId);

      return { ok: true, order: ord.rows[0] };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
