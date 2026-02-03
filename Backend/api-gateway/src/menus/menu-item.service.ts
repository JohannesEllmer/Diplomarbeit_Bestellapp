import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuItemDto } from './dto/update-menu.dto';

@Injectable()
export class MenuItemsService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateMenuItemDto) {
    const res = await this.db.query(
      `INSERT INTO app.menu_items
        (name, description, price, category, available, vegetarian, allergens, drink, dessert, deleted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
      [
        dto.name,
        dto.description ?? '',
        dto.price ?? 0,
        dto.category ?? '',
        dto.available !== false,
        !!dto.vegetarian,
        dto.allergens ?? [],
        dto.drink ?? null,
        dto.dessert ?? null,
      ],
    );

    return this.map(res.rows[0]);
  }

  async findAll() {
    const res = await this.db.query(
      `SELECT id, name, description, price, category, available, vegetarian, allergens, drink, dessert
       FROM app.menu_items
       WHERE deleted = false
       ORDER BY name ASC`,
    );

    return (res.rows ?? []).map(this.map);
  }

  async findOne(id: string) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

    const res = await this.db.query(
      `SELECT id, name, description, price, category, available, vegetarian, allergens, drink, dessert
       FROM app.menu_items
       WHERE id = $1 AND deleted = false
       LIMIT 1`,
      [menuItemId],
    );

    if ((res.rowCount ?? 0) === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

    const res = await this.db.query(
      `UPDATE app.menu_items
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           category = COALESCE($5, category),
           available = COALESCE($6, available),
           vegetarian = COALESCE($7, vegetarian),
           allergens = COALESCE($8, allergens),
           drink = COALESCE($9, drink),
           dessert = COALESCE($10, dessert)
       WHERE id = $1 AND deleted = false
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
      [
        menuItemId,
        dto.name ?? null,
        dto.description ?? null,
        dto.price ?? null,
        dto.category ?? null,
        dto.available ?? null,
        dto.vegetarian ?? null,
        dto.allergens ?? null,
        dto.drink ?? null,
        dto.dessert ?? null,
      ],
    );

    if ((res.rowCount ?? 0) === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  /**
   * ✅ SOFT DELETE (keine 400 mehr!)
   * - nicht blocken wenn in orders
   * - aus meal_plan_menu_items entfernen (damit es "draußen" ist)
   * - optional: aus app.menus entkoppeln (menu_item_id = NULL), falls FK existiert
   * - menu_items.deleted = true
   */
  async remove(id: string) {
  const menuItemId = String(id ?? '').trim();
  if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

  const exists = await this.db.query(
    `SELECT id, deleted FROM app.menu_items WHERE id = $1 LIMIT 1`,
    [menuItemId],
  );
  if (exists.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');

  if (exists.rows[0].deleted === true) {
    return { deleted: true, soft: true, alreadyDeleted: true };
  }

  const client = await this.db.connect();
  try {
    await client.query('BEGIN');

    // ✅ optional: Beziehungen entfernen, damit es im Menüplan sofort verschwindet
    await client.query(
      `DELETE FROM app.meal_plan_menu_items WHERE menu_item_id = $1`,
      [menuItemId],
    );

    // ✅ Soft Delete
    await client.query(
      `UPDATE app.menu_items SET deleted = true WHERE id = $1`,
      [menuItemId],
    );

    await client.query('COMMIT');
    return { deleted: true, soft: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}


  private map = (r: any) => ({
    id: String(r.id),
    name: r.name ?? '',
    description: r.description ?? '',
    price: r.price == null ? 0 : Number(r.price),
    category: r.category ?? '',
    available: !!r.available,
    vegetarian: !!r.vegetarian,
    allergens: Array.isArray(r.allergens) ? r.allergens : [],
    drink: r.drink ?? undefined,
    dessert: r.dessert ?? undefined,
  });
}
