import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { MP_NOT_DELETED, MI_NOT_DELETED, isMissingColumn } from '../soft-delete.sql';

type Db = Pool | PoolClient;

@Injectable()
export class MealPlansRepo {
  async list(db: Db) {
    const r = await db.query(
      `SELECT mp.id, mp.title, mp.is_selected,
              COALESCE(json_agg(json_build_object(
                'id', mi.id, 'name', mi.name, 'description', COALESCE(mi.description,''),
                'price', COALESCE(mi.price,0), 'category', COALESCE(mi.category,''),
                'available', NOT COALESCE(mpmi.is_disabled,false),
                'vegetarian', COALESCE(mi.vegetarian,false),
                'allergens', COALESCE(mi.allergens, ARRAY[]::text[]),
                'drink', mi.drink, 'dessert', mi.dessert
              )) FILTER (WHERE mi.id IS NOT NULL), '[]'::json) AS menu_items
       FROM app.meal_plans mp
       LEFT JOIN app.meal_plan_menu_items mpmi ON mpmi.meal_plan_id=mp.id
       LEFT JOIN app.menu_items mi ON mi.id=mpmi.menu_item_id AND ${MI_NOT_DELETED}
       WHERE ${MP_NOT_DELETED}
       GROUP BY mp.id
       ORDER BY mp.title ASC`,
    );
    return r.rows ?? [];
  }

  async planRow(db: Db, id: string) {
    const r = await db.query(
      `SELECT mp.id, mp.title, mp.is_selected
       FROM app.meal_plans mp
       WHERE mp.id=$1 AND ${MP_NOT_DELETED} LIMIT 1`,
      [id],
    );
    return r.rows?.[0] ?? null;
  }

  async items(db: Db, id: string) {
    const r = await db.query(
      `SELECT mi.*, mpmi.is_disabled
       FROM app.meal_plan_menu_items mpmi
       JOIN app.menu_items mi ON mi.id=mpmi.menu_item_id AND ${MI_NOT_DELETED}
       WHERE mpmi.meal_plan_id=$1
       ORDER BY mi.name ASC`,
      [id],
    );
    return r.rows ?? [];
  }

  async create(db: Db, title: string) {
    const r = await db.query(
      `INSERT INTO app.meal_plans (title, deleted_at, deleted, is_selected)
       VALUES ($1,NULL,false,false) RETURNING id`,
      [title],
    );
    return String(r.rows[0].id);
  }

  async updateTitle(db: Db, id: string, title: string | null) {
    const r = await db.query(
      `UPDATE app.meal_plans SET title=COALESCE($2,title)
       WHERE id=$1 AND ${MP_NOT_DELETED} RETURNING id`,
      [id, title],
    );
    return (r.rowCount ?? 0) > 0;
  }

  async replaceItems(client: PoolClient, mealPlanId: string, menuItemIds: string[]) {
    await client.query(`DELETE FROM app.meal_plan_menu_items WHERE meal_plan_id=$1`, [mealPlanId]);
    for (const raw of menuItemIds ?? []) {
      const itemId = String(raw ?? '').trim();
      if (!itemId) continue;
      const ok = await client.query(`SELECT 1 FROM app.menu_items mi WHERE mi.id=$1 AND ${MI_NOT_DELETED} LIMIT 1`, [itemId]);
      if (ok.rowCount === 0) continue;
      await client.query(
        `INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
         VALUES ($1,$2,false)
         ON CONFLICT (meal_plan_id, menu_item_id) DO UPDATE SET is_disabled=EXCLUDED.is_disabled`,
        [mealPlanId, itemId],
      );
    }
  }

  async setSelected(client: PoolClient, id: string) {
    await client.query(`UPDATE app.meal_plans SET is_selected=false WHERE is_selected=true`);
    await client.query(`UPDATE app.meal_plans SET is_selected=true WHERE id=$1`, [id]);
  }

    async getSelectedId(db: Db): Promise<string | null> {
    const r = await db.query(
      `SELECT mp.id
      FROM app.meal_plans mp
      WHERE mp.is_selected = true
        AND mp.deleted_at IS NULL
      LIMIT 1`,
    );
    return r.rows?.[0]?.id ? String(r.rows[0].id) : null;
  }


async softDelete(db: Db, id: string): Promise<boolean> {
  let changed = 0;

  try {
    const r = await db.query(
      `UPDATE app.meal_plans
       SET deleted_at = NOW(), is_selected = false
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    changed += r.rowCount ?? 0;
  } catch (e) { if (!isMissingColumn(e)) throw e; }

  try {
    const r = await db.query(
      `UPDATE app.meal_plans
       SET deleted = true, is_selected = false
       WHERE id = $1 AND deleted = false`,
      [id],
    );
    changed += r.rowCount ?? 0;
  } catch (e) { if (!isMissingColumn(e)) throw e; }

  return changed > 0;
}

    async addItem(client: PoolClient, mealPlanId: string, menuItemId: string): Promise<boolean> {
    // plan exist?
    const p = await client.query(
      `SELECT 1 FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [mealPlanId],
    );
    if (p.rowCount === 0) return false;

    // item exist?
    const m = await client.query(
      `SELECT 1 FROM app.menu_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [menuItemId],
    );
    if (m.rowCount === 0) return false;

    await client.query(
      `
      INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
      VALUES ($1, $2, false)
      ON CONFLICT (meal_plan_id, menu_item_id) DO NOTHING
      `,
      [mealPlanId, menuItemId],
    );

    return true;
  }

  async removeItem(client: PoolClient, mealPlanId: string, menuItemId: string): Promise<boolean> {
    const p = await client.query(
      `SELECT 1 FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [mealPlanId],
    );
    if (p.rowCount === 0) return false;

    await client.query(
      `DELETE FROM app.meal_plan_menu_items WHERE meal_plan_id = $1 AND menu_item_id = $2`,
      [mealPlanId, menuItemId],
    );

    return true;
  }

  async setItemDisabled(
    client: PoolClient,
    mealPlanId: string,
    menuItemId: string,
    disabled: boolean,
  ): Promise<boolean> {
    const p = await client.query(
      `SELECT 1 FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [mealPlanId],
    );
    if (p.rowCount === 0) return false;

    const m = await client.query(
      `SELECT 1 FROM app.menu_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [menuItemId],
    );
    if (m.rowCount === 0) return false;

    await client.query(
      `
      INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (meal_plan_id, menu_item_id)
      DO UPDATE SET is_disabled = EXCLUDED.is_disabled
      `,
      [mealPlanId, menuItemId, !!disabled],
    );

    return true;
  }
}

