import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationsService } from './notification.service';

@Injectable()
export class NotificationsScheduler {
  constructor(private notifications: NotificationsService) {}

  @Interval(15_000)
  async tick() {
    await this.notifications.deliverDue();
  }
}
