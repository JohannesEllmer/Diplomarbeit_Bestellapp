// src/orders/admin-orders.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminOrdersService } from './adminorders-service';
import { OrderDto } from './dto/order.dto';
import { AuthGuard } from '../common/guards/auth.guards';

@UseGuards(AuthGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly svc: AdminOrdersService) {}

  @Get()
  findAll(): Promise<OrderDto[]> {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<OrderDto> {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<Pick<OrderDto, 'status' | 'items'>>,
  ): Promise<OrderDto> {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.svc.remove(id);
  }
}
