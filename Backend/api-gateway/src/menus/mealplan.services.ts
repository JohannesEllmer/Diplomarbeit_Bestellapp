import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';

@Injectable()
export class MealPlansService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateMealPlanDto) {
    const res = await this.db.query(
      `INSERT INTO meal_plans (title)
       VALUES ($1)
       RETURNING id, title`,
      [dto.title],
    );
    return { id: String(res.rows[0].id), title: res.rows[0].title };
  }

  async findAll() {
    const res = await this.db.query(
      `SELECT id, title FROM meal_plans ORDER BY title ASC`,
    );
    return res.rows.map((r:any) => ({ id: String(r.id), title: r.title }));
  }

  async findOne(id: string) {
    const planRes = await this.db.query(
      `SELECT id, title FROM meal_plans WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (planRes.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const dishesRes = await this.db.query(
      `SELECT d.id, d.name, d.description, d.price, d.allergenes
       FROM meal_plan_dishes mpd
       JOIN dishes d ON d.id = mpd.dish_id
       WHERE mpd.meal_plan_id = $1
       ORDER BY d.name ASC`,
      [id],
    );

    return {
      id: String(planRes.rows[0].id),
      title: planRes.rows[0].title,
      dishes: dishesRes.rows.map((d:any) => ({
        id: String(d.id),
        name: d.name,
        description: d.description ?? '',
        price: d.price == null ? null : Number(d.price),
        allergenes: Array.isArray(d.allergenes) ? d.allergenes : [],
      })),
    };
  }

  async update(id: string, dto: UpdateMealPlanDto) {
    const res = await this.db.query(
      `UPDATE meal_plans
       SET title = COALESCE($2, title)
       WHERE id = $1
       RETURNING id, title`,
      [id, dto.title ?? null],
    );
    if (res.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');
    return { id: String(res.rows[0].id), title: res.rows[0].title };
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM meal_plans WHERE id = $1`, [id]);
    return { deleted: true };
  }

  async setDishes(mealPlanId: string, dishIds: string[]) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const exists = await client.query(`SELECT id FROM meal_plans WHERE id = $1`, [mealPlanId]);
      if (exists.rowCount === 0) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

      await client.query(`DELETE FROM meal_plan_dishes WHERE meal_plan_id = $1`, [mealPlanId]);

      for (const dishId of dishIds) {
        await client.query(
          `INSERT INTO meal_plan_dishes (meal_plan_id, dish_id)
           VALUES ($1, $2)`,
          [mealPlanId, dishId],
        );
      }

      await client.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
