import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth.guards';
import { UsersService } from '../users/users.service';
import { ConfirmBalanceRequestDto } from './dto/confirm-balance.dto';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('balance/confirm')
  @Roles('ADMIN', 'INHABER')
  confirmBalance(@Req() req: any, @Body() dto: ConfirmBalanceRequestDto) {
    const actor = String(req.user?.id ?? req.user?.sub ?? 'admin');
    return this.usersService.confirmBalanceRequestByQr(dto.code, actor);
  }
}
