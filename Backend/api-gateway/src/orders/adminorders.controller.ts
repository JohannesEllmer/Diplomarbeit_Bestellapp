import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth.guards';
import { AdminOrdersService } from './adminorders-service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Req,  ForbiddenException } from '@nestjs/common';
import { CompleteOrderDto } from './dto/complete-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly svc: AdminOrdersService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

      @Patch('complete')
  completeByQr(@Req() req: any, @Body() body: { code?: string }) {
    const role = req.user?.role as string | undefined;
    if (!role || !['ADMIN', 'INHABER'].includes(role)) {
      throw new ForbiddenException('FORBIDDEN');
    }
    return this.svc.completeOrderByQr(body.code ?? '');
  }
}
