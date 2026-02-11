import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MyOrdersController } from './orders.controller';
import { AdminOrdersController } from './adminorders.controller';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { OrdersRepo } from './orders.repo';
import { AppSettingsRepo } from '../app-settings/app-settings.repo';

@Module({
  controllers: [MyOrdersController, AdminOrdersController],
  providers: [OrdersService, AppSettingsService, OrdersRepo, AppSettingsRepo],
})
export class OrdersModule {}
