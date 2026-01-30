import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { MealPlansService } from './mealplan.services';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';
import { SetMealPlanMenuItemsDto } from './dto/set-mealplan-dishes.dto';
import { SetMenuItemDisabledDto } from './dto/set-mealplan-dish-disabled';

import { JwtAuthGuard } from '../auth.guards';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

import { ParseUuidAllPipe } from '../common/parse-uuid-all.pipe';

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly svc: MealPlansService) {}

  @Get('selected')
  getSelected() {
    return this.svc.getSelected();
  }

  @Get('active')
  active() {
    return this.svc.getSelected();
  }

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUuidAllPipe()) id: string) {
    return this.svc.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateMealPlanDto) {
    return this.svc.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id')
  update(
    @Param('id', new ParseUuidAllPipe()) id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.svc.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id', new ParseUuidAllPipe()) id: string) {
    return this.svc.remove(id);
  }

  // -------------------------
  // RELATION ROUTES (menu-items)
  // -------------------------

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post(':id/menu-items')
  setMenuItemsBulk(
    @Param('id', new ParseUuidAllPipe()) id: string,
    @Body() dto: SetMealPlanMenuItemsDto,
  ) {
    return this.svc.setMenuItems(id, dto.menuItemIds);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post(':id/menu-items/:menuItemId')
  addMenuItem(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('menuItemId', new ParseUuidAllPipe()) menuItemId: string,
  ) {
    return this.svc.addMenuItem(mealPlanId, menuItemId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id/menu-items/:menuItemId')
  removeMenuItem(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('menuItemId', new ParseUuidAllPipe()) menuItemId: string,
  ) {
    return this.svc.removeMenuItem(mealPlanId, menuItemId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id/menu-items/:menuItemId/disabled')
  setMenuItemDisabled(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('menuItemId', new ParseUuidAllPipe()) menuItemId: string,
    @Body() dto: SetMenuItemDisabledDto,
  ) {
    return this.svc.setMenuItemDisabled(mealPlanId, menuItemId, dto.disabled);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id/select')
  selectByParam(@Param('id', new ParseUuidAllPipe()) id: string) {
    return this.svc.setSelected(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch('select')
  selectByBody(@Body() dto: { id: string }) {
    return this.svc.setSelected(dto.id);
  }
}
