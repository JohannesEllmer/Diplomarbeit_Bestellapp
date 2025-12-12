import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { OrdersBridgeService } from './orders.bridge.service';
import { MyOrdersService } from './myorders-service';
import { AdminOrdersService } from './adminorders-service';

import { MyOrdersController } from './orders.controller';
import { AdminOrdersController } from './adminorders.controller';

@Module({
  imports: [HttpModule],
  controllers: [MyOrdersController, AdminOrdersController],
  providers: [OrdersBridgeService, MyOrdersService, AdminOrdersService],
  exports: [MyOrdersService, AdminOrdersService],
})
export class OrdersModule {}
