import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../db';
import { DishesRepo } from './dishes.repo';

@Injectable()
export class DishesService {
  constructor(@Inject(PG_POOL) private readonly db: Pool, private readonly repo: DishesRepo) {}

  async findAll() { return (await this.repo.list(this.db)).map(this.map); }

  async findOne(id: string) {
    const dishId = String(id ?? '').trim();
    if (!dishId) throw new BadRequestException('MISSING_DISH_ID');
    const row = await this.repo.byId(this.db, dishId);
    if (!row) throw new NotFoundException('DISH_NOT_FOUND');
    return this.map(row);
  }

  async create(dto: any) { return this.map(await this.repo.insert(this.db, dto)); }

  async update(id: string, dto: any) {
    const dishId = String(id ?? '').trim();
    if (!dishId) throw new BadRequestException('MISSING_DISH_ID');
    const row = await this.repo.patch(this.db, dishId, dto);
    if (!row) throw new NotFoundException('DISH_NOT_FOUND');
    return this.map(row);
  }

  async remove(id: string) {
    const dishId = String(id ?? '').trim();
    if (!dishId) throw new BadRequestException('MISSING_DISH_ID');
    await this.repo.softDelete(this.db, dishId);
    return { deleted: true, soft: true };
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
