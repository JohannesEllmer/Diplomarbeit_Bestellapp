import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMenuEntryDto } from './dto/create-menu-entry.dto';
import { UpdateMenuEntryDto } from './dto/update-menu-entry.dto';

@Injectable()
export class MenusEntriesService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateMenuEntryDto) {
    const res = await this.db.query(
      `INSERT INTO menus (title, dish_menu_item_id, drink, dessert)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, dish_menu_item_id, drink, dessert`,
      [dto.title, dto.dishMenuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );
    return this.map(res.rows[0]);
  }

  async findAll() {
    // optional: Hauptgericht (menu_item) joinen
    const res = await this.db.query(
      `SELECT m.id, m.title, m.dish_menu_item_id, m.drink, m.dessert,
              mi.name as dish_name, mi.price as dish_price
       FROM menus m
       LEFT JOIN menu_items mi ON mi.id = m.dish_menu_item_id
       ORDER BY m.title ASC`,
    );
    return res.rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      dishMenuItemId: r.dish_menu_item_id ? String(r.dish_menu_item_id) : null,
      dish: r.dish_menu_item_id ? { name: r.dish_name, price: Number(r.dish_price ?? 0) } : null,
      drink: r.drink ?? '',
      dessert: r.dessert ?? '',
    }));
  }

  async findOne(id: string) {
    const res = await this.db.query(
      `SELECT id, title, dish_menu_item_id, drink, dessert
       FROM menus
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateMenuEntryDto) {
    const res = await this.db.query(
      `UPDATE menus
       SET title = COALESCE($2, title),
           dish_menu_item_id = COALESCE($3, dish_menu_item_id),
           drink = COALESCE($4, drink),
           dessert = COALESCE($5, dessert)
       WHERE id = $1
       RETURNING id, title, dish_menu_item_id, drink, dessert`,
      [id, dto.title ?? null, dto.dishMenuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM menus WHERE id = $1`, [id]);
    return { deleted: true };
  }

  private map = (r: any) => ({
    id: String(r.id),
    title: r.title,
    dishMenuItemId: r.dish_menu_item_id ? String(r.dish_menu_item_id) : null,
    drink: r.drink ?? '',
    dessert: r.dessert ?? '',
  });
}
