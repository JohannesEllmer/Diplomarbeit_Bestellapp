import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';

type MealPlanRow = { id: string; title: string; is_selected?: boolean };

type MenuItemJoinRow = {
  id: string;
  name: string;
  description?: string | null;
  price?: any;
  category?: string | null;
  available?: boolean | null;
  vegetarian?: boolean | null;
  allergens?: any;
  drink?: string | null;
  dessert?: string | null;
  is_disabled?: boolean | null;
};

@Injectable()
export class MealPlansService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  // -------------------------
  // Create
  // -------------------------
  async create(dto: CreateMealPlanDto) {
    const res = await this.db.query(
      `INSERT INTO app.meal_plans (title)
       VALUES ($1)
       RETURNING id, title, is_selected`,
      [dto.title],
    );

    const r = res.rows[0];
    const id = String(r.id);

    // optional: initial menu items setzen
    if ((dto as any).menuItemIds?.length) {
      await this.setMenuItems(id, (dto as any).menuItemIds);
    }

    // backward-compat optional: falls dto noch dishIds sendet (kannst du später entfernen)
    if ((dto as any).dishIds?.length) {
      await this.setMenuItems(id, (dto as any).dishIds);
    }

    return this.findOne(id);
  }

  // -------------------------
  // Read list
  // -------------------------
  async findAll() {
    const res = await this.db.query(
      `
      SELECT
        mp.id,
        mp.title,
        mp.is_selected,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mi.id,
              'name', mi.name,
              'description', COALESCE(mi.description, ''),
              'price', COALESCE(mi.price, 0),
              'category', COALESCE(mi.category, ''),
              'available', NOT COALESCE(mpmi.is_disabled, false),
              'vegetarian', COALESCE(mi.vegetarian, false),
              'allergens', COALESCE(mi.allergens, ARRAY[]::text[]),
              'drink', mi.drink,
              'dessert', mi.dessert
            )
          ) FILTER (WHERE mi.id IS NOT NULL),
          '[]'::json
        ) AS menu_items
      FROM app.meal_plans mp
      LEFT JOIN app.meal_plan_menu_items mpmi ON mpmi.meal_plan_id = mp.id
      LEFT JOIN app.menu_items mi ON mi.id = mpmi.menu_item_id
      GROUP BY mp.id
      ORDER BY mp.title ASC
      `,
    );

    return (res.rows ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      isSelected: !!r.is_selected,
      menuItems: Array.isArray(r.menu_items) ? r.menu_items : [],
    }));
  }

  // -------------------------
  // Read one
  // -------------------------
  async findOne(id: string) {
    const planRes = await this.db.query<MealPlanRow>(
      `SELECT id, title, is_selected
       FROM app.meal_plans
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    if (planRes.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const itemsRes = await this.db.query<MenuItemJoinRow>(
      `SELECT
         mi.id,
         mi.name,
         mi.description,
         mi.price,
         mi.category,
         mi.available,
         mi.vegetarian,
         mi.allergens,
         mi.drink,
         mi.dessert,
         mpmi.is_disabled
       FROM app.meal_plan_menu_items mpmi
       JOIN app.menu_items mi ON mi.id = mpmi.menu_item_id
       WHERE mpmi.meal_plan_id = $1
       ORDER BY mi.name ASC`,
      [id],
    );

    const plan = planRes.rows[0];

    return {
      id: String(plan.id),
      title: plan.title,
      isSelected: !!plan.is_selected,
      menuItems: (itemsRes.rows ?? []).map((mi: any) => ({
        id: String(mi.id),
        name: String(mi.name ?? ''),
        description: mi.description ?? '',
        price: mi.price == null ? 0 : Number(mi.price),
        category: mi.category ?? '',
        vegetarian: !!mi.vegetarian,
        available: !(mi.is_disabled ?? false),
        allergens: Array.isArray(mi.allergens) ? mi.allergens : [],
        drink: mi.drink ?? undefined,
        dessert: mi.dessert ?? undefined,
      })),
    };
  }

  // -------------------------
  // Update
  // -------------------------
  async update(id: string, dto: UpdateMealPlanDto) {
    const res = await this.db.query(
      `UPDATE app.meal_plans
       SET title = COALESCE($2, title)
       WHERE id = $1
       RETURNING id, title, is_selected`,
      [id, dto.title ?? null],
    );
    if (res.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    // optional bulk: menuItemIds
    if ((dto as any).menuItemIds) {
      await this.setMenuItems(id, (dto as any).menuItemIds);
    }

    // backward-compat optional: dishIds
    if ((dto as any).dishIds) {
      await this.setMenuItems(id, (dto as any).dishIds);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM app.meal_plans WHERE id = $1`, [id]);
    return { deleted: true };
  }

  // -------------------------
  // Bulk Set
  // -------------------------
  async setMenuItems(mealPlanId: string, menuItemIds: string[]) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
        [mealPlanId],
      );
      if (exists.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

      await client.query(
        `DELETE FROM app.meal_plan_menu_items WHERE meal_plan_id = $1`,
        [mealPlanId],
      );

      for (const menuItemId of menuItemIds ?? []) {
        await client.query(
          `INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
           VALUES ($1, $2, false)
           ON CONFLICT (meal_plan_id, menu_item_id)
           DO UPDATE SET is_disabled = EXCLUDED.is_disabled`,
          [mealPlanId, menuItemId],
        );
      }

      await client.query('COMMIT');
      return this.findOne(mealPlanId);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // -------------------------
  // Single add/remove
  // -------------------------
  async addMenuItem(mealPlanId: string, menuItemId: string) {
    await this.db.query(
      `INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
       VALUES ($1, $2, false)
       ON CONFLICT (meal_plan_id, menu_item_id) DO NOTHING`,
      [mealPlanId, menuItemId],
    );

    const check = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
      [mealPlanId],
    );
    if (check.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return this.findOne(mealPlanId);
  }

  async removeMenuItem(mealPlanId: string, menuItemId: string) {
    await this.db.query(
      `DELETE FROM app.meal_plan_menu_items
       WHERE meal_plan_id = $1 AND menu_item_id = $2`,
      [mealPlanId, menuItemId],
    );

    const check = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
      [mealPlanId],
    );
    if (check.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return this.findOne(mealPlanId);
  }

  // -------------------------
  // Disabled setzen
  // -------------------------
  async setMenuItemDisabled(mealPlanId: string, menuItemId: string, disabled: boolean) {
    await this.db.query(
      `INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (meal_plan_id, menu_item_id)
       DO UPDATE SET is_disabled = EXCLUDED.is_disabled`,
      [mealPlanId, menuItemId, !!disabled],
    );

    const check = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
      [mealPlanId],
    );
    if (check.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return this.findOne(mealPlanId);
  }

  // -------------------------
  // Selected / Active
  // -------------------------
  async getSelected(): Promise<any | null> {
    const mpRes = await this.db.query<MealPlanRow>(
      `SELECT id, title, is_selected
       FROM app.meal_plans
       WHERE is_selected = true
       LIMIT 1`,
    );

    if (mpRes.rowCount === 0) return null;

    return this.findOne(String(mpRes.rows[0].id));
  }

  async setSelected(mealPlanId: string): Promise<{ ok: true; id: string }> {
    const id = String(mealPlanId ?? '').trim();
    if (!id) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const existsRes = await client.query(
        `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (existsRes.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

      await client.query(`UPDATE app.meal_plans SET is_selected = false WHERE is_selected = true`);
      await client.query(`UPDATE app.meal_plans SET is_selected = true WHERE id = $1`, [id]);

      await client.query('COMMIT');
      return { ok: true, id };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
