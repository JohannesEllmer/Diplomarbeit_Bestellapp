import { Injectable } from '@nestjs/common';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Menu } from './entities/menu.entity';

@Injectable()
export class MenusService {
  private menus: Menu[] = [];

  create(createMenuDto: CreateMenuDto) {
    const newMenu = { id: Date.now().toString(), ...createMenuDto };
    this.menus.push(newMenu);
    return newMenu;
  }

  findAll() {
    return this.menus;
  }

  findOne(id: number) {
    return this.menus.find(menu => menu.id === id.toString());
  }

  update(id: number, updateMenuDto: UpdateMenuDto) {
    const menu = this.menus.find(menu => menu.id === id.toString());
    if (!menu) return undefined;
    Object.assign(menu, updateMenuDto);
    return menu;
  }

  remove(id: number) {
    return this.menus = this.menus.filter(menu => menu.id !== id.toString());
    return { deleted: true };
  }
}
