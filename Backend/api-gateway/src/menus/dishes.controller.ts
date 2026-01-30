import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { MenuItemsService } from './menu-item.service';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuItemDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth.guards';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly svc: MenuItemsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateMenuItemDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(id);
  }
}
