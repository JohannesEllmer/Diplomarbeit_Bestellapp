import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../db';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { OrdersRepo } from './orders.repo';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { OrderResponseDto, OrderItemResponseDto } from './dto/order-response.dto';
import { UserRefDto } from './dto/user-ref.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PG_POOL) private readonly db: Pool,
    private readonly settings: AppSettingsService,
    private readonly repo: OrdersRepo,
  ) {}

  async getMyOrders(userId: string) {
    const ids = await this.repo.listIdsByUser(this.db, String(userId));
    const out: OrderResponseDto[] = [];
    for (const id of ids) out.push(await this.buildOrderResponse(id));
    return out;
  }

  async findAll() {
    const ids = await this.repo.listIdsAll(this.db);
    const out: OrderResponseDto[] = [];
    for (const id of ids) out.push(await this.buildOrderResponse(id));
    return out;
  }

  async findOne(id: string) {
    return this.buildOrderResponse(String(id));
  }

  async createForUser(jwtUserId: string, dto: CreateOrderDto) {
    const userId = String(jwtUserId ?? '').trim();
    if (!userId) throw new BadRequestException('MISSING_USER_ID');

    if (!(await this.settings.getOrderingEnabled())) {
      throw new ForbiddenException('ORDERING_DISABLED');
    }
    if (!dto?.items?.length) throw new BadRequestException('EMPTY_ORDER');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const uRes = await this.repo.lockUserBalance(client, userId);
      if (uRes.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

      const balance = Number(uRes.rows?.[0]?.balance ?? 0);
      if (!Number.isFinite(balance) || balance < 0) {
        throw new BadRequestException('INVALID_USER_BALANCE');
      }

      const orderId = await this.repo.insertOpenOrder(client, userId);

      const total = await this.insertItemsAndComputeTotal(
        client,
        orderId,
        userId,
        dto.items,
      );

      await this.repo.updateOrderTotal(client, orderId, total);

      if (balance < total) throw new ForbiddenException('INSUFFICIENT_FUNDS');
      await this.repo.debitUser(client, userId, total);

      await client.query('COMMIT');
      return this.buildOrderResponse(orderId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(id: string, dto: UpdateOrderDto) {
    const orderId = String(id ?? '').trim();
    if (!orderId) throw new BadRequestException('MISSING_ORDER_ID');

    if (dto.status) {
      await this.db.query(`UPDATE app.orders SET status=$2 WHERE id=$1`, [orderId, dto.status]);
    }

    if (dto.items) {
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        const ord = await client.query(
          `SELECT id,user_id FROM app.orders WHERE id=$1 LIMIT 1`,
          [orderId],
        );
        if (ord.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

        const ownerUserId = String(ord.rows[0].user_id);

        await this.repo.deleteOrderItems(client, orderId);

        const total = await this.insertItemsAndComputeTotal(
          client,
          orderId,
          ownerUserId,
          dto.items,
        );

        await this.repo.updateOrderTotal(client, orderId, total);

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

  async remove(id: string) {
    const orderId = String(id ?? '').trim();
    if (!orderId) return;
    await this.repo.deleteOrderItems(this.db, orderId);
    await this.repo.deleteOrder(this.db, orderId);
  }

  async completeByQrCode(code: string) {
    const m = /^Order-([0-9a-fA-F-]{36})$/.exec(String(code || '').trim());
    if (!m) return { ok: false };

    const orderId = String(m[1]);
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const oRes = await this.repo.lockOrder(client, orderId);
      if (oRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

      const status = String(oRes.rows[0]?.status ?? '');
      if (status === 'closed') {
        await client.query('COMMIT');
        return { ok: true, orderId };
      }

      await this.repo.closeOrder(client, orderId);
      await this.repo.markDelivered(client, orderId);

      await client.query('COMMIT');
      return { ok: true, orderId };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async insertItemsAndComputeTotal(
    client: PoolClient,
    orderId: string,
    userId: string,
    items: CreateOrderItemDto[],
  ) {
    let total = 0;
    const activeMealPlanId = await this.repo.getActiveMealPlanId(client);

    for (const it of items ?? []) {
      const menuItemId = String(it.menuItemId ?? '').trim();
      if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

      const qty = Number(it.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('INVALID_QUANTITY');

      if (activeMealPlanId) {
        const ok = await this.repo.assertItemInActiveMenu(client, activeMealPlanId, menuItemId);
        if (!ok) throw new ForbiddenException(`MENU_ITEM_NOT_IN_ACTIVE_MENU:${menuItemId}`);
      }

      const mRes = await this.repo.getMenuItemForOrder(client, menuItemId);
      if (mRes.rowCount === 0) throw new NotFoundException(`MENU_ITEM_NOT_FOUND:${menuItemId}`);
      if (mRes.rows[0]?.available === false) {
        throw new ForbiddenException(`MENU_ITEM_NOT_AVAILABLE:${menuItemId}`);
      }

      const price = Number(mRes.rows[0]?.price ?? 0);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('INVALID_PRICE');

      total += price * qty;

      await this.repo.insertOrderItem(
        client,
        orderId,
        userId,
        menuItemId,
        qty,
        it.note ?? null,
        it.deliveryTime ? new Date(it.deliveryTime) : null,
      );
    }

    return total;
  }

  private async buildOrderResponse(orderId: string): Promise<OrderResponseDto> {
    const orderRes = await this.repo.loadOrderHeader(this.db, orderId);
    if (orderRes.rowCount === 0) throw new NotFoundException('ORDER_NOT_FOUND');

    const o = orderRes.rows[0];

    const countRes = await this.repo.loadOrderCount(this.db, String(o.user_id));
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

    const itemsRes = await this.repo.loadOrderItems(this.db, orderId);
    const items: OrderItemResponseDto[] = (itemsRes.rows ?? []).map((r: any) => {
    const dessert = r?.m_dessert ?? r?.dessert ?? undefined;
    const drink = r?.m_drink ?? r?.drink ?? undefined;

    return {
      menuItem: {
        id: String(r?.m_id),
        name: r?.m_name ?? '',
        description: r?.m_description ?? '',
        price: Number(r?.m_price ?? 0),
        category: r?.m_category ?? '',
        available: !!r?.m_available,
        vegetarian: !!r?.m_vegetarian,
        allergens: Array.isArray(r?.m_allergens) ? r.m_allergens : [],
        drink,
        dessert,
      },
      user: userDto,
      note: r?.note ?? '',
      quantity: Number(r?.quantity ?? 0),
      delivered: !!r?.delivered,
      deliveryTime: r?.delivery_time ? new Date(r.delivery_time).toISOString() : undefined,
    };
  });


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
