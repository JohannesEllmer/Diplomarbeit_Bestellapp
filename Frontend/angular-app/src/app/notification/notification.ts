import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { NotificationService } from '../services/notification';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.css'],
})
export class NotificationsPageComponent {
  readonly notifications$: Observable<AppNotification[]>;

  constructor(public notifications: NotificationService) {
    this.notifications$ = this.notifications.notifications$;
  }

  markRead(id: string): void {
    this.notifications.markRead(id);
  }

  clearAll(): void {
    this.notifications.clearAll();
  }
}
