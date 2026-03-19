import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppMenuComponent } from './app-menu/app-menu';
import {CookieNotice} from './cookie-notice/cookie-notice';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule, AppMenuComponent, CookieNotice],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {}
