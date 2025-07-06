import { Component } from '@angular/core';
import { MenuPlanComponent } from './menu-plan-component/menu-plan-component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MenuPlanComponent],
  template: '<app-menu-plan></app-menu-plan>',
  styleUrls: ['./app.css']
})
export class AppComponent {}