import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { Inject } from '@nestjs/common';
import { PG_POOL } from '../db';
import { MenuItemsRepo } from './menu-items.repo';

@Injectable()
export class MenuItemsService {
  constructor(@Inject(PG_POOL) private readonly db: Pool, private readonly repo: MenuItemsRepo) {}

  async findAll() {
    return (await this.repo.findAll(this.db)).map(this.map);
  }

  async findOne(id: string) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');
    const row = await this.repo.findOne(this.db, menuItemId);
    if (!row) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(row);
  }

  async create(dto: any) {
    const row = await this.repo.create(this.db, dto);
    return this.map(row);
  }

  async update(id: string, dto: any) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');
    const row = await this.repo.update(this.db, menuItemId, dto);
    if (!row) throw new NotFoundException('MENU_ITEM_NOT_FOUND');
    return this.map(row);
  }

  async remove(id: string) {
    const menuItemId = String(id ?? '').trim();
    if (!menuItemId) throw new BadRequestException('MISSING_MENU_ITEM_ID');
    await this.repo.softDelete(this.db, menuItemId);
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
