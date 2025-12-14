import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { MyOrdersService } from './myorders-service';
import { AdminOrdersService } from './adminorders-service';
import { MyOrdersController } from './orders.controller';
import { AdminOrdersController } from './adminorders.controller';

@Module({
  controllers: [MyOrdersController, AdminOrdersController],
  providers: [OrdersService, MyOrdersService, AdminOrdersService],
})
export class OrdersModule {}
