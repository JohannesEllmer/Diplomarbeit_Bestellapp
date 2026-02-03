import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MenusEntriesService } from './menu-entries.service';
import { CreateMenuEntryDto } from './dto/create-menu-entry.dto';
import { UpdateMenuEntryDto } from './dto/update-menu-entry.dto';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusEntriesService) {}

  @Post()
  create(@Body() dto: CreateMenuEntryDto) {
    return this.menusService.create(dto);
  }

  @Get()
  findAll() {
    return this.menusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuEntryDto) {
    return this.menusService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }
}
