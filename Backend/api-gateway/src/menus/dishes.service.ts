import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

@Injectable()
export class DishesService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateDishDto) {
    const res = await this.db.query(
      `INSERT INTO dishes (name, description, price, allergenes)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, description, price, allergenes`,
      [dto.name, dto.description ?? null, dto.price ?? null, dto.allergenes ?? []],
    );
    return this.map(res.rows[0]);
  }

  async findAll() {
    const res = await this.db.query(
      `SELECT id, name, description, price, allergenes
       FROM dishes
       ORDER BY name ASC`,
    );
    return res.rows.map(this.map);
  }

  async findOne(id: string) {
    const res = await this.db.query(
      `SELECT id, name, description, price, allergenes
       FROM dishes
       WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) throw new NotFoundException('DISH_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async update(id: string, dto: UpdateDishDto) {
    const res = await this.db.query(
      `UPDATE dishes
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           allergenes = COALESCE($5, allergenes)
       WHERE id = $1
       RETURNING id, name, description, price, allergenes`,
      [id, dto.name ?? null, dto.description ?? null, dto.price ?? null, dto.allergenes ?? null],
    );
    if (res.rowCount === 0) throw new NotFoundException('DISH_NOT_FOUND');
    return this.map(res.rows[0]);
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM dishes WHERE id = $1`, [id]);
    return { deleted: true };
  }

  private map = (r: any) => ({
    id: String(r.id),
    name: r.name,
    description: r.description ?? '',
    price: r.price == null ? null : Number(r.price),
    allergenes: Array.isArray(r.allergenes) ? r.allergenes : [],
  });
}
