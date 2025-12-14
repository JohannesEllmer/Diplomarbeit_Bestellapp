import { Module } from '@nestjs/common';

import { MenuItemsController } from './menu-item.controller';
import { MenuItemsService } from './menu-item.service';

import { MenusEntriesController } from './menu-entries.controller';
import { MenusEntriesService } from './menu-entries.service';

import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';

import { MealPlansController } from './mealplan.controller';
import { MealPlansService } from './mealplan.services';

@Module({
  controllers: [
    MenuItemsController,
    MenusEntriesController,
    DishesController,
    MealPlansController,
  ],
  providers: [
    MenuItemsService,
    MenusEntriesService,
    DishesService,
    MealPlansService,
  ],
})
export class MenusModule {}
