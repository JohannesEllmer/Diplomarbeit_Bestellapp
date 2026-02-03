import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMenuEntryDto } from './dto/create-menu-entry.dto';
import { UpdateMenuEntryDto } from './dto/update-menu-entry.dto';

@Injectable()
export class MenusEntriesService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateMenuEntryDto) {
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('MISSING_TITLE');

    const res = await this.db.query(
      `
      INSERT INTO app.menus (title, menu_item_id, drink, dessert, deleted)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id, title, menu_item_id, drink, dessert
      `,
      [title, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );

    return this.map(res.rows[0]);
  }

  async findAll() {
    const res = await this.db.query(
      `
      SELECT m.id, m.title, m.menu_item_id, m.drink, m.dessert,
             mi.name as item_name, mi.price as item_price
      FROM app.menus m
      LEFT JOIN app.menu_items mi
        ON mi.id = m.menu_item_id
       AND mi.deleted_at IS NULL
      WHERE m.deleted = false
      ORDER BY m.title ASC
      `,
    );

    return (res.rows ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.title ?? '',
      menuItemId: r.menu_item_id ? String(r.menu_item_id) : null,
      menuItem: r.menu_item_id
        ? { name: r.item_name ?? '', price: Number(r.item_price ?? 0) }
        : null,
      drink: r.drink ?? '',
      dessert: r.dessert ?? '',
    }));
  }

  async findOne(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `
      SELECT id, title, menu_item_id, drink, dessert
      FROM app.menus
      WHERE id = $1 AND deleted = false
      LIMIT 1
      `,
      [menuId],
    );

    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateMenuEntryDto) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `
      UPDATE app.menus
      SET title = COALESCE($2, title),
          menu_item_id = COALESCE($3, menu_item_id),
          drink = COALESCE($4, drink),
          dessert = COALESCE($5, dessert)
      WHERE id = $1 AND deleted = false
      RETURNING id, title, menu_item_id, drink, dessert
      `,
      [menuId, dto.title ?? null, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );

    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  // ✅ Soft delete
  async remove(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `UPDATE app.menus SET deleted = true WHERE id = $1 AND deleted = false RETURNING id`,
      [menuId],
    );

    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return { deleted: true, soft: true };
  }

  private map = (r: any) => ({
    id: String(r.id),
    title: r.title ?? '',
    menuItemId: r.menu_item_id ? String(r.menu_item_id) : null,
    drink: r.drink ?? '',
    dessert: r.dessert ?? '',
  });
}
