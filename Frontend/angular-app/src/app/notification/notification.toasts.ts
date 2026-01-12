import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { NotificationService } from '../services/notification';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-notification-toasts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.toast.html',
  styleUrls: ['./notification.toast.css'],
})
export class NotificationToastsComponent {
  toasts$: Observable<AppNotification[]>;

  constructor(public notifications: NotificationService, private router: Router) {
    this.toasts$ = this.notifications.toastNotifications$;
  }

  close(n: AppNotification, ev: MouseEvent) {
    ev.stopPropagation();
    this.notifications.dismissToast(n.id);
  }

  open(n: AppNotification) {
    this.notifications.markRead(n.id);
    this.notifications.dismissToast(n.id);
    this.router.navigate([n.link ?? '/benachrichtigungen']);
  }
}
