import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth.guards';
import { UsersService } from '../users/users.service';
import { ConfirmBalanceRequestDto } from './dto/confirm-balance.dto';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('balance/preview')
  @Roles('ADMIN', 'INHABER')
  previewBalance(@Body() dto: ConfirmBalanceRequestDto) {
    return this.usersService.previewBalanceRequestByQr(dto.code);
  }

  @Post('balance/confirm')
  @Roles('ADMIN', 'INHABER')
  confirmBalance(@Req() req: any, @Body() dto: ConfirmBalanceRequestDto) {
    const actor = String(req.user?.id ?? req.user?.sub ?? 'admin');
    return this.usersService.confirmBalanceRequestByQr(dto.code, actor);
  }

  @Get('pending-deletions')
  @Roles('ADMIN', 'INHABER')
  listPendingDeletions() {
    return this.usersService.listPendingDeletions();
  }

  @Post(':id/purge/preview')
  @Roles('ADMIN', 'INHABER')
  purgePreview(@Param('id') id: string) {
    return this.usersService.purgePreview(String(id));
  }

  @Delete(':id/purge')
  @Roles('ADMIN', 'INHABER')
  purgeConfirm(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { confirmText: string },
  ) {
    const actor = String(req.user?.id ?? req.user?.sub ?? 'admin');
    return this.usersService.purgeConfirm(
      String(id),
      String(body?.confirmText ?? ''),
      actor,
    );
  }
}