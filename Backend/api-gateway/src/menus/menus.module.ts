import { Module } from '@nestjs/common';

import { MenuItemsController } from './menu-item.controller';
import { MenuItemsService } from './menu-item.service';

import { MenusEntriesController } from './menu-entries.controller';
import { MenusEntriesService } from './menu-entries.service';



import { MealPlansController } from './mealplan.controller';
import { MealPlansService } from './mealplan.services';
import { ParseUuidAllPipe } from '../common/parse-uuid-all.pipe';

@Module({
  controllers: [
    MenuItemsController,
    MenusEntriesController,
    MealPlansController,
  ],
  providers: [
    MenuItemsService,
    MenusEntriesService,
    MealPlansService,
    ParseUuidAllPipe,
  ],
})
export class MenusModule {}
