import { Component, OnInit } from '@angular/core';
import { CookieNoticeService } from '../services/cookie-notice/cookie-notice.service';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-cookie-notice',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cookie-notice.html',
  styleUrls: ['./cookie-notice.scss']
})
export class CookieNotice implements OnInit {
  isVisible = false;

  constructor(private cookieNoticeService: CookieNoticeService) {}

  ngOnInit(): void {
    this.isVisible = !this.cookieNoticeService.isDismissed();
  }

  dismiss(): void {
    this.cookieNoticeService.dismiss();
    this.isVisible = false;
  }
}
