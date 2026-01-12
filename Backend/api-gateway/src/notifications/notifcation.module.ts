import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { NotificationsController } from './notification.controller';
import { NotificationsService } from './notification.service';
import { NotificationsRepo } from './notification.repo';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepo],
  exports: [NotificationsService],
})
export class NotificationsModule {}
