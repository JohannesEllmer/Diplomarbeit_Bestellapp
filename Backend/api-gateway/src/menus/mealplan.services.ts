import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../db';
import { MealPlansRepo } from './mealplan.repo';

@Injectable()
export class MealPlansService {
  constructor(
    @Inject(PG_POOL) private readonly db: Pool,
    private readonly repo: MealPlansRepo,
  ) {}

  async findAll() {
    const rows = await this.repo.list(this.db);
    return rows.map((r: any) => ({
      id: String(r.id),
      title: r.title ?? '',
      isSelected: !!r.is_selected,
      menuItems: r.menu_items ?? [],
    }));
  }

  async findOne(id: string) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const plan = await this.repo.planRow(this.db, mealPlanId);
    if (!plan) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const items = await this.repo.items(this.db, mealPlanId);
    return {
      id: String(plan.id),
      title: plan.title ?? '',
      isSelected: !!plan.is_selected,
      menuItems: items.map((mi: any) => ({
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

  async create(dto: any) {
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('MISSING_TITLE');

    const id = await this.repo.create(this.db, title);

    const ids = (dto.menuItemIds?.length ? dto.menuItemIds : dto.dishIds?.length ? dto.dishIds : []) as string[];
    if (ids.length) {
      const c = await this.db.connect();
      try {
        await c.query('BEGIN');
        await this.repo.replaceItems(c, id, ids);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    }

    return this.findOne(id);
  }

  async update(id: string, dto: any) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const ok = await this.repo.updateTitle(
      this.db,
      mealPlanId,
      dto.title != null ? String(dto.title).trim() : null,
    );
    if (!ok) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const ids = (dto.menuItemIds?.length ? dto.menuItemIds : dto.dishIds?.length ? dto.dishIds : undefined) as
      | string[]
      | undefined;

    if (ids) {
      const c = await this.db.connect();
      try {
        await c.query('BEGIN');
        await this.repo.replaceItems(c, mealPlanId, ids);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    }

    return this.findOne(mealPlanId);
  }

  async remove(id: string) {
    const mealPlanId = String(id ?? '').trim();
    if (!mealPlanId) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const ok = await this.repo.softDelete(this.db, mealPlanId);
    if (!ok) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    return { deleted: true, soft: true };
  }

  async getSelected() {
    const id = await this.repo.getSelectedId(this.db);
    return id ? this.findOne(id) : null;
  }

  async setSelected(mealPlanId: string) {
    const id = String(mealPlanId ?? '').trim();
    if (!id) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

    const plan = await this.repo.planRow(this.db, id);
    if (!plan) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');

    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      await this.repo.setSelected(c, id);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }

    return { ok: true, id };
  }

  async addMenuItem(mealPlanId: string, menuItemId: string) {
    const mpId = String(mealPlanId ?? '').trim();
    const miId = String(menuItemId ?? '').trim();
    if (!mpId || !miId) throw new BadRequestException('MISSING_IDS');

    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      const ok = await this.repo.addItem(c, mpId, miId);
      if (!ok) throw new NotFoundException('MEAL_PLAN_OR_MENU_ITEM_NOT_FOUND');
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }

    return this.findOne(mpId);
  }

  async removeMenuItem(mealPlanId: string, menuItemId: string) {
    const mpId = String(mealPlanId ?? '').trim();
    const miId = String(menuItemId ?? '').trim();
    if (!mpId || !miId) throw new BadRequestException('MISSING_IDS');

    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      const ok = await this.repo.removeItem(c, mpId, miId);
      if (!ok) throw new NotFoundException('MEAL_PLAN_NOT_FOUND');
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }

    return this.findOne(mpId);
  }

  async setMenuItemDisabled(mealPlanId: string, menuItemId: string, disabled: boolean) {
    const mpId = String(mealPlanId ?? '').trim();
    const miId = String(menuItemId ?? '').trim();
    if (!mpId || !miId) throw new BadRequestException('MISSING_IDS');

    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      const ok = await this.repo.setItemDisabled(c, mpId, miId, !!disabled);
      if (!ok) throw new NotFoundException('MEAL_PLAN_OR_MENU_ITEM_NOT_FOUND');
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }

    return this.findOne(mpId);
  }
}
