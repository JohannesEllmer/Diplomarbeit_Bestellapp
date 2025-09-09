import { Component } from '@angular/core';
import {Menu, MENUS} from './models';

@Component({
  selector: 'app-menu-manager',
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.css'
})
export class MenuManager {
  Menus: Menu[] = MENUS;

  selectedMenu: Menu | null = null;

  selectMenu(menu: Menu): void {
    if(menu != this.selectedMenu) {
      this.selectedMenu = menu;
    }else{
      this.selectedMenu = null; // Deselect if the same menu is clicked again
    }
    console.log('Selected Menu:', this.selectedMenu);
  }
}
