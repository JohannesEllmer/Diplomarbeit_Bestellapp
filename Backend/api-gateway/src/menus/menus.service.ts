import { Injectable } from '@nestjs/common';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuItemDto } from './dto/update-menu.dto';
import { Menu } from './entities/menu.entity';

@Injectable()
export class MenusService {
  private menus: Menu[] = [];

  create(createMenuItemDto: CreateMenuItemDto) {
    const newMenu: Menu = { id: Date.now().toString(), ...createMenuItemDto } as any;
    this.menus.push(newMenu);
    return newMenu;
  }

  findAll() {
    return this.menus;
  }

  findOne(id: number) {
    return this.menus.find(menu => menu.id === id.toString());
  }

  update(id: number, updateMenuItemDto: UpdateMenuItemDto) {
    const menu = this.menus.find(menu => menu.id === id.toString());
    if (!menu) return undefined;
    Object.assign(menu, updateMenuItemDto);
    return menu;
  }

  remove(id: number) {
    this.menus = this.menus.filter(menu => menu.id !== id.toString());
    return { deleted: true };
  }
}
