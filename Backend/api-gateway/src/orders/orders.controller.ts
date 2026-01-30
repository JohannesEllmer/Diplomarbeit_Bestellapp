import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth.guards';
import { MyOrdersService } from './myorders-service';
import { CreateOrderDto } from './dto/create-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class MyOrdersController {
  constructor(private readonly svc: MyOrdersService) {}

  @Get('my')
  getMy(@Req() req: any) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.svc.getMyOrders(userId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.svc.createOrder(userId, dto);
  }
}
