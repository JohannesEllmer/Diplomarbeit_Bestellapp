import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth.guards';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './dto/update-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'INHABER')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll() {
    return this.orders.findAll();
  }

  @Patch('complete')
  completeByQr(@Body() body: { code?: string }) {
    return this.orders.completeByQrCode(body.code ?? '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orders.remove(id);
  }
}
