import { Module } from '@nestjs/common';

import { MenuItemsController } from './menu-item.controller';
import { MenuItemsService } from './menu-item.service';

import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';



import { MealPlansController } from './mealplan.controller';
import { MealPlansService } from './mealplan.services';
import { ParseUuidAllPipe } from '../common/parse-uuid-all.pipe';
import { MenusRepo } from './menu.repo';
import { MealPlansRepo } from './mealplan.repo';
import { DishesRepo } from './dishes.repo';
import { MenuItemsRepo } from './menu-items.repo';

@Module({
  controllers: [
    MenuItemsController,
    MenusController,
    MealPlansController,
  ],
  providers: [
    MenuItemsService,
    MenusService,
    MealPlansService,
    ParseUuidAllPipe,
    MenusRepo,
    MenuItemsRepo,
    MealPlansRepo,
    DishesRepo
  ],
})
export class MenusModule {}
