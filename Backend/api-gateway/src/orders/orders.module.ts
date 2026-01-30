import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MyOrdersService } from './myorders-service';
import { AdminOrdersService } from './adminorders-service';
import { MyOrdersController } from './orders.controller';
import { AdminOrdersController } from './adminorders.controller';
import { AppSettingsService } from '../app-settings/app-settings.service';

@Module({
  controllers: [MyOrdersController, AdminOrdersController],
  providers: [OrdersService, MyOrdersService, AdminOrdersService, AppSettingsService],
})
export class OrdersModule {}
