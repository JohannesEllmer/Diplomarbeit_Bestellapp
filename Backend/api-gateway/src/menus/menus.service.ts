import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { CreateMenuEntryDto } from './dto/create-menu-entry.dto';
import { UpdateMenuEntryDto } from './dto/update-menu-entry.dto';

@Injectable()
export class MenusService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  create(dto: CreateMenuEntryDto) {
    return this.db.query(
      `INSERT INTO app.menus (title, menu_item_id, drink, dessert, deleted)
       VALUES ($1,$2,$3,$4,false)
       RETURNING id, title, menu_item_id, drink, dessert`,
      [dto.title, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    ).then(r => r.rows[0]);
  }

  findAll() {
    return this.db.query(
      `SELECT id, title, menu_item_id, drink, dessert
       FROM app.menus
       WHERE deleted = false
       ORDER BY title ASC`,
    ).then(r => r.rows);
  }

  async findOne(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `SELECT id, title, menu_item_id, drink, dessert
       FROM app.menus
       WHERE id = $1 AND deleted = false
       LIMIT 1`,
      [menuId],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return res.rows[0];
  }

  async update(id: string, dto: UpdateMenuEntryDto) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `UPDATE app.menus
       SET title = COALESCE($2, title),
           menu_item_id = COALESCE($3, menu_item_id),
           drink = COALESCE($4, drink),
           dessert = COALESCE($5, dessert)
       WHERE id = $1 AND deleted = false
       RETURNING id, title, menu_item_id, drink, dessert`,
      [menuId, dto.title ?? null, dto.menuItemId ?? null, dto.drink ?? null, dto.dessert ?? null],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return res.rows[0];
  }

  async remove(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');

    const res = await this.db.query(
      `UPDATE app.menus SET deleted = true WHERE id = $1 AND deleted = false RETURNING id`,
      [menuId],
    );
    if (res.rowCount === 0) throw new NotFoundException('MENU_NOT_FOUND');
    return { deleted: true, soft: true };
  }
}
