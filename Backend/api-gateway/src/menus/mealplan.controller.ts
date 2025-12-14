import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MealPlansService } from './mealplan.services';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';
import { SetMealPlanDishesDto } from './dto/set-mealplan-dishes.dto';
import { JwtAuthGuard } from '../auth.guards';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly svc: MealPlansService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateMealPlanDto) { return this.svc.create(dto); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMealPlanDto) { return this.svc.update(id, dto); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INHABER', 'ADMIN')
  @Post(':id/dishes')
  setDishes(@Param('id') id: string, @Body() dto: SetMealPlanDishesDto) {
    return this.svc.setDishes(id, dto.dishIds);
  }
}
