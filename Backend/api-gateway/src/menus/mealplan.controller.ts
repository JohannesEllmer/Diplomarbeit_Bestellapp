import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  BadRequestException,
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

  // -------------------------
  // ✅ /:id/select (PARAM) — getrennt registrieren
  // -------------------------
  @Post(':id/select')
  setSelectedPost(@Param('id', ParseUuidAllPipe) id: string) {
    return this.mealPlans.setSelected(id);
  }

  @Patch(':id/select')
  setSelectedPatch(@Param('id', ParseUuidAllPipe) id: string) {
    return this.mealPlans.setSelected(id);
  }

  // -------------------------
  // ✅ /select (BODY) — getrennt registrieren
  // -------------------------
  @Post('select')
  setSelectedByBodyPost(@Body('id') id: string) {
    return this.setSelectedByBodyImpl(id);
  }

  @Patch('select')
  setSelectedByBodyPatch(@Body('id') id: string) {
    return this.setSelectedByBodyImpl(id);
  }

private setSelectedByBodyImpl(id: string) {
  const raw = String(id ?? '').trim();
  if (!raw) throw new BadRequestException('MISSING_MEAL_PLAN_ID');

  // ✅ Pipe nur mit 1 Argument (passt zu deiner Signatur)
  const validated = this.uuidAll.transform(raw) as any;

  return this.mealPlans.setSelected(String(validated));
}


  @Get(':id')
  findOne(@Param('id', ParseUuidAllPipe) id: string) {
    return this.mealPlans.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUuidAllPipe) id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.mealPlans.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUuidAllPipe) id: string) {
    return this.mealPlans.remove(id);
  }

  @Post(':id/items/:menuItemId')
  addMenuItem(
    @Param('id', ParseUuidAllPipe) id: string,
    @Param('menuItemId', ParseUuidAllPipe) menuItemId: string,
  ) {
    return this.mealPlans.addMenuItem(id, menuItemId);
  }

  @Delete(':id/items/:menuItemId')
  removeMenuItem(
    @Param('id', ParseUuidAllPipe) id: string,
    @Param('menuItemId', ParseUuidAllPipe) menuItemId: string,
  ) {
    return this.mealPlans.removeMenuItem(id, menuItemId);
  }

  @Patch(':id/items/:menuItemId/disabled/:disabled')
  setDisabled(
    @Param('id', ParseUuidAllPipe) id: string,
    @Param('menuItemId', ParseUuidAllPipe) menuItemId: string,
    @Param('disabled') disabled: string,
  ) {
    return this.mealPlans.setMenuItemDisabled(id, menuItemId, disabled === 'true');
  }
}
