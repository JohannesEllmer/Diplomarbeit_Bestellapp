import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
        (name, description, price, category, available, vegetarian, allergens, drink, dessert)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
      [
        dto.name,
        dto.description ?? '',
        dto.price ?? 0,
        dto.category ?? '',
        !!dto.available,
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
       ORDER BY name ASC`,
    );
    return res.rows.map(this.map);
  }

  async findOne(id: string) {
    const res = await this.db.query(
      `SELECT id, name, description, price, category, available, vegetarian, allergens, drink, dessert
       FROM app.menu_items
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateMenuItemDto) {
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
       WHERE id = $1
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
      [
        id,
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
    if (res.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM app.menu_items WHERE id = $1`, [id]);
    return { deleted: true };
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
