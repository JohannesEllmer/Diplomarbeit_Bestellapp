import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
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
      `
      INSERT INTO app.menu_items
        (name, description, price, category, available, vegetarian, allergens, drink, dessert, deleted_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL)
      RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert
      `,
      [
        (dto.name ?? '').trim(),
        (dto.description ?? '').trim(),
        Number(dto.price ?? 0),
        (dto.category ?? '').trim(),
        dto.available !== false,
        !!dto.vegetarian,
        dto.allergens ?? [],
        dto.drink ?? null,
        dto.dessert ?? null,
      ],
    );

    return this.map(res.rows[0]);
  }

  // ✅ nur NICHT gelöschte liefern
  async findAll() {
    const res = await this.db.query(
      `
      SELECT id, name, description, price, category, available, vegetarian, allergens, drink, dessert
      FROM app.menu_items
      WHERE deleted_at IS NULL
      ORDER BY name ASC
      `,
    );

    return (res.rows ?? []).map(this.map);
  }

  // ✅ nur NICHT gelöschte laden
  async findOne(id: string) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

    const res = await this.db.query(
      `
      SELECT id, name, description, price, category, available, vegetarian, allergens, drink, dessert
      FROM app.menu_items
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [menuItemId],
    );

    if (res.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

    const res = await this.db.query(
      `
      UPDATE app.menu_items
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          category = COALESCE($5, category),
          available = COALESCE($6, available),
          vegetarian = COALESCE($7, vegetarian),
          allergens = COALESCE($8, allergens),
          drink = COALESCE($9, drink),
          dessert = COALESCE($10, dessert)
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert
      `,
      [
        menuItemId,
        dto.name != null ? String(dto.name).trim() : null,
        dto.description != null ? String(dto.description).trim() : null,
        dto.price != null ? Number(dto.price) : null,
        dto.category != null ? String(dto.category).trim() : null,
        dto.available != null ? !!dto.available : null,
        dto.vegetarian != null ? !!dto.vegetarian : null,
        dto.allergens ?? null,
        dto.drink != null ? String(dto.drink).trim() || null : null,
        dto.dessert != null ? String(dto.dessert).trim() || null : null,
      ],
    );

    if (res.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  /**
   * ✅ SOFT DELETE:
   * - setzt deleted_at + available=false
   * - entfernt das Item aus meal_plan_menu_items (damit es “draußen” ist)
   * - optional: entkoppelt app.menus.menu_item_id (damit keine FK-Probleme)
   */
  async remove(id: string) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');

    const exists = await this.db.query(
      `SELECT id, deleted_at FROM app.menu_items WHERE id = $1 LIMIT 1`,
      [menuItemId],
    );
    if (exists.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');

    if (exists.rows[0]?.deleted_at != null) {
      return { deleted: true, soft: true, alreadyDeleted: true };
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // ✅ aus MealPlans lösen (damit es nicht mehr in Menüplänen auftaucht)
      await client.query(
        `DELETE FROM app.meal_plan_menu_items WHERE menu_item_id = $1`,
        [menuItemId],
      );

      // ✅ optional: wenn app.menus.menu_item_id FK auf menu_items hat
      await client.query(
        `UPDATE app.menus SET menu_item_id = NULL WHERE menu_item_id = $1`,
        [menuItemId],
      );

      // ✅ Soft delete
      const upd = await client.query(
        `
        UPDATE app.menu_items
        SET deleted_at = NOW(),
            available = false
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING id
        `,
        [menuItemId],
      );

      if (upd.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');

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
