import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateUserDto } from './dto/create-user.dto';
import { MenuHeaderDto } from './dto/menu-header.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async create(dto: CreateUserDto) {
    try {
      const res = await this.db.query(
        `INSERT INTO app.users
         (name, email, class, role, balance, blocked, school_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, name, email, class, role, balance, blocked, school_type`,
        [
          dto.name,
          dto.email,
          dto.class ?? null,
          dto.role,
          dto.balance ?? 0,
          dto.blocked ?? false,
          (dto as any).schoolType ?? null,
        ],
      );
      return res.rows[0];
    } catch (e: any) {
      if (e.code === '23505') {
        throw new ConflictException('EMAIL_ALREADY_EXISTS');
      }
      throw e;
    }
  }

  async findAll() {
    const res = await this.db.query(
      `SELECT
         u.id, u.name, u.email, u.class, u.role, u.balance, u.blocked,
         COALESCE(COUNT(o.id), 0) AS order_count
       FROM app.users u
       LEFT JOIN app.orders o ON o.user_id = u.id
       GROUP BY u.id
       ORDER BY u.name ASC`,
    );

    return res.rows.map(r => ({
      ...r,
      balance: Number(r.balance ?? 0),
      order_count: Number(r.order_count ?? 0),
      blocked: !!r.blocked,
    }));
  }

  async findOne(id: string) {
    const res = await this.db.query(
      `SELECT id, name, email, class, role, balance, blocked, school_type
       FROM app.users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    return res.rows[0];
  }

  async update(id: string, dto: Partial<CreateUserDto>) {
    const res = await this.db.query(
      `UPDATE app.users
       SET name        = COALESCE($2, name),
           email       = COALESCE($3, email),
           class       = COALESCE($4, class),
           role        = COALESCE($5, role),
           blocked     = COALESCE($6, blocked),
           school_type = COALESCE($7, school_type)
       WHERE id = $1
       RETURNING id, name, email, class, role, balance, blocked, school_type`,
      [
        id,
        dto.name ?? null,
        dto.email ?? null,
        dto.class ?? null,
        dto.role ?? null,
        dto.blocked ?? null,
        (dto as any).schoolType ?? null,
      ],
    );

    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    return res.rows[0];
  }

  async remove(id: string) {
    await this.db.query(`DELETE FROM app.users WHERE id = $1`, [id]);
    return { deleted: true };
  }

  async updateBalanceDelta(id: string, delta: number) {
    const res = await this.db.query(
      `UPDATE app.users
       SET balance = balance + $2
       WHERE id = $1
       RETURNING id, name, email, class, role, balance, blocked, school_type`,
      [id, delta],
    );

    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');
    return res.rows[0];
  }

  async getMyHeader(auth: { sub?: string; email?: string }): Promise<MenuHeaderDto> {
    const res = auth.sub
      ? await this.db.query(
          `SELECT
             u.id, u.name, u.email, u.role, u.balance, u.blocked, u.class,
             COALESCE(COUNT(o.id), 0) AS order_count
           FROM app.users u
           LEFT JOIN app.orders o ON o.user_id = u.id
           WHERE u.id = $1
           GROUP BY u.id
           LIMIT 1`,
          [auth.sub],
        )
      : await this.db.query(
          `SELECT
             u.id, u.name, u.email, u.role, u.balance, u.blocked, u.class,
             COALESCE(COUNT(o.id), 0) AS order_count
           FROM app.users u
           LEFT JOIN app.orders o ON o.user_id = u.id
           WHERE u.email = $1
           GROUP BY u.id
           LIMIT 1`,
          [auth.email],
        );

    if (res.rowCount === 0) throw new NotFoundException('USER_NOT_FOUND');

    const u = res.rows[0];
    return {
      id: String(u.id),
      name: u.name,
      email: u.email,
      role: u.role,
      balance: Number(u.balance ?? 0),
      blocked: !!u.blocked,
      class: u.class ?? undefined,
      orderCount: Number(u.order_count ?? 0),
    };
  }
}
