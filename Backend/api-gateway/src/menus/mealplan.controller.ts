// src/menus/mealplan.controller.ts
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
import { SetMealPlanDishesDto } from './dto/set-mealplan-dishes.dto';
import { SetDishDisabledDto } from './dto/set-mealplan-dish-disabled';

import { JwtAuthGuard } from '../auth.guards';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

import { ParseUuidAllPipe } from '../common/parse-uuid-all.pipe';

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly svc: MealPlansService) {}

  // ✅ Statische routes vor :id
  @Get('selected')
  getSelected() {
    return this.svc.getSelected();
  }

  @Get('active')
  active() {
    return this.svc.getSelected();
  }

  // --- CRUD ---
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

  // --- RELATION ROUTES (genau die, die dein Frontend aufruft) ---

  // Bulk setzen (optional)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post(':id/dishes')
  setDishesBulk(
    @Param('id', new ParseUuidAllPipe()) id: string,
    @Body() dto: SetMealPlanDishesDto,
  ) {
    return this.svc.setDishes(id, dto.dishIds);
  }

  // ✅ einzelnes Gericht hinzufügen (Drag von rechts nach links)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post(':id/dishes/:dishId')
  addDish(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('dishId', new ParseUuidAllPipe()) dishId: string,
  ) {
    return this.svc.addDish(mealPlanId, dishId);
  }

  // ✅ einzelnes Gericht entfernen (Drag von links nach rechts)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id/dishes/:dishId')
  removeDish(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('dishId', new ParseUuidAllPipe()) dishId: string,
  ) {
    return this.svc.removeDish(mealPlanId, dishId);
  }

  // ✅ Checkbox: sofort deaktivieren/aktivieren
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id/dishes/:dishId/disabled')
  setDishDisabled(
    @Param('id', new ParseUuidAllPipe()) mealPlanId: string,
    @Param('dishId', new ParseUuidAllPipe()) dishId: string,
    @Body() dto: SetDishDisabledDto,
  ) {
    return this.svc.setDishDisabled(mealPlanId, dishId, dto.disabled);
  }

  // ✅ Menü aktiv setzen (wie gehabt)
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
