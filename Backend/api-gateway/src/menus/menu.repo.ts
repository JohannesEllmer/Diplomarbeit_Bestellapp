import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { M_NOT_DELETED, MI_NOT_DELETED, isMissingColumn } from '../soft-delete.sql';

type Db = Pool | PoolClient;

@Injectable()
export class MenusRepo {
  async list(db: Db) {
    const r = await db.query(
      `SELECT m.id, m.title, m.menu_item_id, m.drink, m.dessert,
              mi.name AS item_name, mi.price AS item_price
       FROM app.menus m
       LEFT JOIN app.menu_items mi ON mi.id=m.menu_item_id AND ${MI_NOT_DELETED}
       WHERE ${M_NOT_DELETED}
       ORDER BY m.title ASC`,
    );
    return r.rows ?? [];
  }

  async byId(db: Db, id: string) {
    const r = await db.query(
      `SELECT m.id, m.title, m.menu_item_id, m.drink, m.dessert
       FROM app.menus m
       WHERE m.id=$1 AND ${M_NOT_DELETED} LIMIT 1`,
      [id],
    );
    return r.rows?.[0] ?? null;
  }

  async insert(db: Db, dto: any) {
    const r = await db.query(
      `INSERT INTO app.menus (title, menu_item_id, drink, dessert, deleted, deleted_at)
       VALUES ($1,$2,$3,$4,false,NULL)
       RETURNING id, title, menu_item_id, drink, dessert`,
      [dto.title, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );
    return r.rows[0];
  }

  async patch(db: Db, id: string, dto: any) {
    const r = await db.query(
      `UPDATE app.menus m
       SET title=COALESCE($2,m.title),
           menu_item_id=COALESCE($3,m.menu_item_id),
           drink=COALESCE($4,m.drink),
           dessert=COALESCE($5,m.dessert)
       WHERE m.id=$1 AND ${M_NOT_DELETED}
       RETURNING id, title, menu_item_id, drink, dessert`,
      [id, dto.title ?? null, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );
    return r.rows?.[0] ?? null;
  }

  async softDelete(db: Db, id: string) {
    try { await db.query(`UPDATE app.menus SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL`, [id]); }
    catch (e) { if (!isMissingColumn(e)) throw e; }

    try { await db.query(`UPDATE app.menus SET deleted=true WHERE id=$1 AND deleted=false`, [id]); }
    catch (e) { if (!isMissingColumn(e)) throw e; }
  }
}
