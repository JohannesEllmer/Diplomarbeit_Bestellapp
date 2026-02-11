import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { MI_NOT_DELETED, isMissingColumn } from '../soft-delete.sql';

type Db = Pool | PoolClient;

@Injectable()
export class MenuItemsRepo {
  async findAll(db: Db) {
    const res = await db.query(
      `SELECT mi.id, mi.name, mi.description, mi.price, mi.category, mi.available,
              mi.vegetarian, mi.allergens, mi.drink, mi.dessert
       FROM app.menu_items mi
       WHERE ${MI_NOT_DELETED}
       ORDER BY mi.name ASC`,
    );
    return res.rows ?? [];
  }

  async findOne(db: Db, id: string) {
    const res = await db.query(
      `SELECT mi.id, mi.name, mi.description, mi.price, mi.category, mi.available,
              mi.vegetarian, mi.allergens, mi.drink, mi.dessert
       FROM app.menu_items mi
       WHERE mi.id = $1 AND ${MI_NOT_DELETED}
       LIMIT 1`,
      [id],
    );
    return res.rows?.[0] ?? null;
  }

  async create(db: Db, dto: any) {
    const res = await db.query(
      `INSERT INTO app.menu_items
        (name, description, price, category, available, vegetarian, allergens, drink, dessert, deleted, deleted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,NULL)
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
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
    return res.rows[0];
  }

  async update(db: Db, id: string, dto: any) {
    const res = await db.query(
      `UPDATE app.menu_items mi
       SET name = COALESCE($2, mi.name),
           description = COALESCE($3, mi.description),
           price = COALESCE($4, mi.price),
           category = COALESCE($5, mi.category),
           available = COALESCE($6, mi.available),
           vegetarian = COALESCE($7, mi.vegetarian),
           allergens = COALESCE($8, mi.allergens),
           drink = COALESCE($9, mi.drink),
           dessert = COALESCE($10, mi.dessert)
       WHERE mi.id = $1 AND ${MI_NOT_DELETED}
       RETURNING id, name, description, price, category, available, vegetarian, allergens, drink, dessert`,
      [
        id,
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
    return res.rows?.[0] ?? null;
  }

  // Soft delete: versucht deleted_at + deleted (beide)
  async softDelete(db: Db, id: string) {
    try {
      await db.query(
        `UPDATE app.menu_items SET deleted_at = NOW(), available = false WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
    } catch (e) {
      if (!isMissingColumn(e)) throw e;
    }

    try {
      await db.query(
        `UPDATE app.menu_items SET deleted = true, available = false WHERE id = $1 AND deleted = false`,
        [id],
      );
    } catch (e) {
      if (!isMissingColumn(e)) throw e;
    }

    return true;
  }
}
