// src/menus/mealplan.services.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';

type MealPlanRow = { id: string; title: string; is_selected?: boolean };

type DishJoinRow = {
  id: string;
  name: string;
  description?: string | null;
  price?: any;
  allergenes?: any;
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

    // optional: initial dishes setzen (nur beim Erstellen)
    if (dto.dishIds?.length) {
      await this.setDishes(id, dto.dishIds);
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
              'id', d.id,
              'name', d.name,
              'description', COALESCE(d.description, ''),
              'price', COALESCE(d.price, 0),
              'allergenes', COALESCE(d.allergenes, ARRAY[]::text[]),

              -- ✅ wichtig für dein Frontend:
              'available', NOT COALESCE(mpd.is_disabled, false),
              'vegetarian', false,
              'category', 'Hauptgericht',
              'allergens', COALESCE(d.allergenes, ARRAY[]::text[])
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'::json
        ) AS dishes
      FROM app.meal_plans mp
      LEFT JOIN app.meal_plan_dishes mpd ON mpd.meal_plan_id = mp.id
      LEFT JOIN app.dishes d ON d.id = mpd.dish_id
      GROUP BY mp.id
      ORDER BY mp.title ASC
      `,
    );

    return (res.rows ?? []).map((r: any) => ({
      id: String(r.id),
      title: r.title,
      isSelected: !!r.is_selected,
      dishes: Array.isArray(r.dishes) ? r.dishes : [],
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

    const dishesRes = await this.db.query<DishJoinRow>(
      `SELECT
         d.id, d.name, d.description, d.price, d.allergenes,
         mpd.is_disabled
       FROM app.meal_plan_dishes mpd
       JOIN app.dishes d ON d.id = mpd.dish_id
       WHERE mpd.meal_plan_id = $1
       ORDER BY d.name ASC`,
      [id],
    );

    const plan = planRes.rows[0];

    return {
      id: String(plan.id),
      title: plan.title,
      isSelected: !!plan.is_selected,
      dishes: (dishesRes.rows ?? []).map((d: any) => ({
        id: String(d.id),
        name: String(d.name ?? ''),
        description: d.description ?? '',
        price: d.price == null ? 0 : Number(d.price),

        // beide Namen, damit dein Frontend nie “leer” ist:
        allergenes: Array.isArray(d.allergenes) ? d.allergenes : [],
        allergens: Array.isArray(d.allergenes) ? d.allergenes : [],

        // ✅ entscheidend:
        available: !(d.is_disabled ?? false),

        // falls du es brauchst:
        vegetarian: false,
        category: 'Hauptgericht',
      })),
    };
  }

  // -------------------------
  // Update (Titel + optional bulk)
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

    // optional bulk: wenn du es irgendwann wieder brauchst
    if (dto.dishIds) {
      await this.setDishes(id, dto.dishIds);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM app.meal_plans WHERE id = $1`, [id]);
    return { deleted: true };
  }

  // -------------------------
  // Bulk Set (ersetzt alle Beziehungen)
  // -------------------------
  async setDishes(mealPlanId: string, dishIds: string[]) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(
        `SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`,
        [mealPlanId],
      );
      if (exists.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

      await client.query(`DELETE FROM app.meal_plan_dishes WHERE meal_plan_id = $1`, [mealPlanId]);

      for (const dishId of dishIds ?? []) {
        await client.query(
          `INSERT INTO app.meal_plan_dishes (meal_plan_id, dish_id, is_disabled)
           VALUES ($1, $2, false)
           ON CONFLICT (meal_plan_id, dish_id) DO UPDATE SET is_disabled = EXCLUDED.is_disabled`,
          [mealPlanId, dishId],
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
  // ✅ Single add/remove (für Drag&Drop Edit)
  // -------------------------
  async addDish(mealPlanId: string, dishId: string) {
    const res = await this.db.query(
      `INSERT INTO app.meal_plan_dishes (meal_plan_id, dish_id, is_disabled)
       VALUES ($1, $2, false)
       ON CONFLICT (meal_plan_id, dish_id) DO NOTHING`,
      [mealPlanId, dishId],
    );

    // wenn mealPlan nicht existiert, kommt hier kein FK? -> lieber checken:
    const check = await this.db.query(`SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`, [mealPlanId]);
    if (check.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return this.findOne(mealPlanId);
  }

  async removeDish(mealPlanId: string, dishId: string) {
    await this.db.query(
      `DELETE FROM app.meal_plan_dishes
       WHERE meal_plan_id = $1 AND dish_id = $2`,
      [mealPlanId, dishId],
    );

    const check = await this.db.query(`SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`, [mealPlanId]);
    if (check.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return this.findOne(mealPlanId);
  }

  // -------------------------
  // ✅ Checkbox sofort: disabled setzen
  // -------------------------
  async setDishDisabled(mealPlanId: string, dishId: string, disabled: boolean) {
    // Upsert: falls Beziehung noch nicht existiert, wird sie erstellt
    await this.db.query(
      `INSERT INTO app.meal_plan_dishes (meal_plan_id, dish_id, is_disabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (meal_plan_id, dish_id)
       DO UPDATE SET is_disabled = EXCLUDED.is_disabled`,
      [mealPlanId, dishId, !!disabled],
    );

    const check = await this.db.query(`SELECT id FROM app.meal_plans WHERE id = $1 LIMIT 1`, [mealPlanId]);
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
