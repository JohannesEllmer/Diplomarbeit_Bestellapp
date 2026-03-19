import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CookieNoticeService {
  private readonly STORAGE_KEY = 'cookie_notice_dismissed';

  isDismissed(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  dismiss(): void {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }
}
