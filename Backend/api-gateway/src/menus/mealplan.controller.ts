import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MealPlansService } from './mealplan.services';
import { CreateMealPlanDto } from './dto/create-mealplan.dto';
import { UpdateMealPlanDto } from './dto/update-mealplan.dto';
import { ParseUuidAllPipe } from '../common/parse-uuid-all.pipe';

@Controller('meal-plans')
export class MealPlansController {
  constructor(
    private readonly mealPlans: MealPlansService,
    private readonly uuidAll: ParseUuidAllPipe,
  ) {}

  @Post()
  create(@Body() dto: CreateMealPlanDto) {
    return this.mealPlans.create(dto);
  }

  @Get()
  findAll() {
    return this.mealPlans.findAll();
  }

  @Get('selected')
  getSelected() {
    return this.mealPlans.getSelected();
  }

  @Post(':id/select')
  setSelectedPost(@Param('id') id: string) {
    return this.mealPlans.setSelected(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Patch(':id/select')
  setSelectedPatch(@Param('id') id: string) {
    return this.mealPlans.setSelected(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Post('select')
  setSelectedByBodyPost(@Body('id') id: string) {
    return this.mealPlans.setSelected(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Patch('select')
  setSelectedByBodyPatch(@Body('id') id: string) {
    return this.mealPlans.setSelected(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mealPlans.findOne(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMealPlanDto) {
    return this.mealPlans.update(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mealPlans.remove(this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'));
  }

  @Post(':id/items/:menuItemId')
  addMenuItem(@Param('id') id: string, @Param('menuItemId') menuItemId: string) {
    return this.mealPlans.addMenuItem(
      this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'),
      this.mustUuid(menuItemId, 'MISSING_MENU_ITEM_ID'),
    );
  }

  @Delete(':id/items/:menuItemId')
  removeMenuItem(@Param('id') id: string, @Param('menuItemId') menuItemId: string) {
    return this.mealPlans.removeMenuItem(
      this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'),
      this.mustUuid(menuItemId, 'MISSING_MENU_ITEM_ID'),
    );
  }

  @Patch(':id/items/:menuItemId/disabled/:disabled')
  setDisabled(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('disabled') disabled: string,
  ) {
    return this.mealPlans.setMenuItemDisabled(
      this.mustUuid(id, 'MISSING_MEAL_PLAN_ID'),
      this.mustUuid(menuItemId, 'MISSING_MENU_ITEM_ID'),
      disabled === 'true',
    );
  }

  private mustUuid(value: string, missingCode: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) throw new BadRequestException(missingCode);
    const validated = this.uuidAll.transform(raw) as any;
    return String(validated);
  }
}
