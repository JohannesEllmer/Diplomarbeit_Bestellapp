// src/orders/my-orders.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MyOrdersService } from './myorders-service';
import { CreateOrderDto } from './dto/order.dto';
import { CurrentUserId } from '../common/decorator/current-user-id.decorator';
import { AuthGuard } from '../common/guards/auth.guards';

@UseGuards(AuthGuard)
@Controller('orders')
export class MyOrdersController {
  constructor(private readonly svc: MyOrdersService) {}

  @Get('my')
  getMy(@CurrentUserId() userId: string) {
    return this.svc.getMyOrders(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateOrderDto) {
    return this.svc.createOrder(userId, dto);
  }
}
