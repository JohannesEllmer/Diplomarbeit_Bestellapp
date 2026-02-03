import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';

type MealPlanRow = { id: string; title: string; is_selected?: boolean };

@Injectable()
export class MealPlansService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateMealPlanDto) {
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('MISSING_TITLE');

    const res = await this.db.query(
      `INSERT INTO app.meal_plans (title, deleted_at)
       VALUES ($1, NULL)
       RETURNING id`,
      [title],
    );

    const id = String(res.rows[0].id);

    const ids =
      (dto as any).menuItemIds?.length ? (dto as any).menuItemIds :
      (dto as any).dishIds?.length ? (dto as any).dishIds :
      [];

    if (ids.length) await this.setMenuItems(id, ids);

    return this.findOne(id);
  }

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
      LEFT JOIN app.menu_items mi
        ON mi.id = mpmi.menu_item_id
       AND mi.deleted_at IS NULL
      WHERE mp.deleted_at IS NULL
      GROUP BY mp.id
      ORDER BY mp.title ASC
      `,
    );

    return (res.rows ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.title ?? '',
      isSelected: !!r.is_selected,
      menuItems: Array.isArray(r.menu_items) ? r.menu_items : [],
    }));
  }

  async findOne(id: string) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const planRes = await this.db.query<MealPlanRow>(
      `
      SELECT id, title, is_selected
      FROM app.meal_plans
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [mealPlanId],
    );
    if (planRes.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const itemsRes = await this.db.query(
      `
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.category,
        mi.vegetarian,
        mi.allergens,
        mi.drink,
        mi.dessert,
        mpmi.is_disabled
      FROM app.meal_plan_menu_items mpmi
      JOIN app.menu_items mi
        ON mi.id = mpmi.menu_item_id
       AND mi.deleted_at IS NULL
      WHERE mpmi.meal_plan_id = $1
      ORDER BY mi.name ASC
      `,
      [mealPlanId],
    );

    const plan = planRes.rows[0];

    return {
      id: String(plan.id),
      title: plan.title ?? '',
      isSelected: !!plan.is_selected,
      menuItems: (itemsRes.rows ?? []).map((mi: any) => ({
        id: String(mi.id),
        name: mi.name ?? '',
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

  async update(id: string, dto: UpdateMealPlanDto) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const res = await this.db.query(
      `
      UPDATE app.meal_plans
      SET title = COALESCE($2, title)
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id
      `,
      [mealPlanId, dto.title != null ? String(dto.title).trim() : null],
    );

    if (res.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const ids =
      (dto as any).menuItemIds?.length ? (dto as any).menuItemIds :
      (dto as any).dishIds?.length ? (dto as any).dishIds :
      undefined;

    if (ids) await this.setMenuItems(mealPlanId, ids);

    return this.findOne(mealPlanId);
  }

  async remove(id: string) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const exists = await this.db.query(
      `SELECT id, is_selected FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [mealPlanId],
    );
    if (exists.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const wasSelected = !!exists.rows[0]?.is_selected;

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      if (wasSelected) {
        await client.query(
          `UPDATE app.meal_plans SET is_selected = false WHERE id = $1`,
          [mealPlanId],
        );
      }

      await client.query(
        `UPDATE app.meal_plans
         SET deleted_at = NOW(), is_selected = false
         WHERE id = $1`,
        [mealPlanId],
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

  async setMenuItems(mealPlanId: string, menuItemIds: string[]) {
    const id = String(mealPlanId ?? '').trim();
    if (!id) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [id],
      );
      if (exists.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

      await client.query(`DELETE FROM app.meal_plan_menu_items WHERE meal_plan_id = $1`, [id]);

      for (const rawItemId of menuItemIds ?? []) {
        const itemId = String(rawItemId ?? '').trim();
        if (!itemId) continue;

        // optional strict: nur nicht-gelöschte menu_items reinlassen
        const item = await client.query(
          `SELECT id FROM app.menu_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
          [itemId],
        );
        if (item.rowCount === 0) continue;

        await client.query(
          `
          INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
          VALUES ($1, $2, false)
          ON CONFLICT (meal_plan_id, menu_item_id)
          DO UPDATE SET is_disabled = EXCLUDED.is_disabled
          `,
          [id, itemId],
        );
      }

      await client.query('COMMIT');
      return this.findOne(id);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getSelected(): Promise<any | null> {
    const mpRes = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE is_selected = true AND deleted_at IS NULL LIMIT 1`,
    );
    if (mpRes.rowCount === 0) return null;
    return this.findOne(String(mpRes.rows[0].id));
  }

  async setSelected(mealPlanId: string): Promise<{ ok: true; id: string }> {
    const id = String(mealPlanId ?? '').trim();
    if (!id) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const existsRes = await client.query(
        `SELECT id FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
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

  // -------------------------
  // ✅ Single add/remove/disable
  // -------------------------
  async addMenuItem(mealPlanId: string, menuItemId: string) {
    const id = String(mealPlanId ?? '').trim();
    const itemId = String(menuItemId ?? '').trim();
    if (!id || !itemId) throw new BadRequestException('MISSING_IDS');

    const plan = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (plan.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const item = await this.db.query(
      `SELECT id FROM app.menu_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [itemId],
    );
    if (item.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');

    await this.db.query(
      `
      INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
      VALUES ($1, $2, false)
      ON CONFLICT (meal_plan_id, menu_item_id) DO NOTHING
      `,
      [id, itemId],
    );

    return this.findOne(id);
  }

  async removeMenuItem(mealPlanId: string, menuItemId: string) {
    const id = String(mealPlanId ?? '').trim();
    const itemId = String(menuItemId ?? '').trim();
    if (!id || !itemId) throw new BadRequestException('MISSING_IDS');

    const plan = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (plan.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    await this.db.query(
      `DELETE FROM app.meal_plan_menu_items WHERE meal_plan_id = $1 AND menu_item_id = $2`,
      [id, itemId],
    );

    return this.findOne(id);
  }

  async setMenuItemDisabled(mealPlanId: string, menuItemId: string, disabled: boolean) {
    const id = String(mealPlanId ?? '').trim();
    const itemId = String(menuItemId ?? '').trim();
    if (!id || !itemId) throw new BadRequestException('MISSING_IDS');

    const plan = await this.db.query(
      `SELECT id FROM app.meal_plans WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (plan.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const item = await this.db.query(
      `SELECT id FROM app.menu_items WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [itemId],
    );
    if (item.rowCount === 0) throw new NotFoundException('MENU_ITEM_NOT_FOUND');

    await this.db.query(
      `
      INSERT INTO app.meal_plan_menu_items (meal_plan_id, menu_item_id, is_disabled)
      VALUES ($1, $2, $3)
      ON CONFLICT (meal_plan_id, menu_item_id)
      DO UPDATE SET is_disabled = EXCLUDED.is_disabled
      `,
      [id, itemId, !!disabled],
    );

    return this.findOne(id);
  }
}
