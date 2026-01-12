import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NotificationService } from '../services/notification';
import { AppNotification } from '../../models/notification.model';

@Component({
  selector: 'app-owner-notifications-today',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-notifications.html',
  styleUrls: ['./owner-notifications.today.css'],
})
export class OwnerNotificationsTodayComponent implements OnInit {
  today: AppNotification[] = [];
  loading = false;

  constructor(private notifications: NotificationService) {}

  ngOnInit(): void {
    this.loading = true;

    this.notifications.loadOwnerToday().subscribe({
      next: (rows: any[]) => {
        this.today = (rows ?? []).map(r => ({
          id: String(r.id),
          type: r.type,
          title: r.title ?? '',
          message: r.message ?? '',
          link: r.link ?? '/benachrichtigungen',
          data: r.data ?? {},
          createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
          read: !!r.read || !!r.read_at,
        }));
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
