import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../db';
import { MenusRepo } from './menu.repo';

@Injectable()
export class MenusService {
  constructor(@Inject(PG_POOL) private readonly db: Pool, private readonly repo: MenusRepo) {}

  async findAll() {
    const rows = await this.repo.list(this.db);
    return rows.map((r: any) => ({
      id: String(r.id),
      title: r.title ?? '',
      menuItemId: r.menu_item_id ? String(r.menu_item_id) : null,
      menuItem: r.menu_item_id ? { name: r.item_name ?? '', price: Number(r.item_price ?? 0) } : null,
      drink: r.drink ?? '',
      dessert: r.dessert ?? '',
    }));
  }

  async findOne(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');
    const r = await this.repo.byId(this.db, menuId);
    if (!r) throw new NotFoundException('MENU_NOT_FOUND');
    return { id: String(r.id), title: r.title ?? '', menuItemId: r.menu_item_id ?? null, drink: r.drink ?? '', dessert: r.dessert ?? '' };
  }

  async create(dto: any) {
    const title = String(dto.title ?? '').trim();
    if (!title) throw new BadRequestException('MISSING_TITLE');
    return this.repo.insert(this.db, { ...dto, title }).then(r => ({
      id: String(r.id), title: r.title ?? '', menuItemId: r.menu_item_id ?? null, drink: r.drink ?? '', dessert: r.dessert ?? '',
    }));
  }

  async update(id: string, dto: any) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');
    const r = await this.repo.patch(this.db, menuId, dto);
    if (!r) throw new NotFoundException('MENU_NOT_FOUND');
    return { id: String(r.id), title: r.title ?? '', menuItemId: r.menu_item_id ?? null, drink: r.drink ?? '', dessert: r.dessert ?? '' };
  }

  async remove(id: string) {
    const menuId = String(id ?? '').trim();
    if (!menuId) throw new BadRequestException('MISSING_MENU_ID');
    await this.repo.softDelete(this.db, menuId);
    return { deleted: true, soft: true };
  }
}
