import {
  Controller,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notification.service';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getJwtUserId(req: any): string {
  const id = String(req?.user?.id ?? req?.user?.sub ?? '').trim();
  if (!id) throw new UnauthorizedException('NOT_AUTHENTICATED');
  if (!UUID_RE.test(id)) throw new BadRequestException('USER_ID_INVALID');
  return id;
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // ✅ User latest
  @Get('latest')
  async latest(@Req() req: any, @Query('beforeId') beforeId?: string, @Query('limit') limit?: string) {
    const userId = getJwtUserId(req);

    const lim = Number(limit ?? 20);
    const safeLimit = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 50) : 20;

    const b = String(beforeId ?? '').trim();
    const safeBeforeId = UUID_RE.test(b) ? b : null;

    return this.notifications.listLatestForUser(userId, safeBeforeId, safeLimit);
  }

  // ✅ mark read
  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = getJwtUserId(req);
    return this.notifications.markRead(userId, id);
  }

  // ✅ clear user notifications
  @Delete('clear')
  async clear(@Req() req: any) {
    const userId = getJwtUserId(req);
    return this.notifications.clearForUser(userId);
  }

  // ✅ OWNER: Tagesübersicht
  @Get('owner/today')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('INHABER', 'ADMIN')
  async ownerToday(@Query('limit') limit?: string) {
    const lim = Number(limit ?? 200);
    const safeLimit = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 500) : 200;
    return this.notifications.ownerToday(safeLimit);
  }
}
