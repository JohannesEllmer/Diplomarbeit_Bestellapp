import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MenuItemsService } from './menu-item.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth.guards';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly svc: MenuItemsService) {}

  // Lesen darf jeder (optional ohne Auth; wenn du Login brauchst: @UseGuards(JwtAuthGuard) hinzufügen)
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // Schreiben nur INHABER/ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
