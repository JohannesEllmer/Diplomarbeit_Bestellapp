import { Component } from '@angular/core';
import { Menu } from '../../models/menu.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-manager',
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.css'
})
export class MenuManager {
  Menus: Menu[] = [
    { title: 'Menu1', dishes: [] },
    { title: 'Menu2', dishes: [] },
    { title: 'Menu3', dishes: [] },
    { title: 'Menu4', dishes: [] },
    { title: 'Menu5', dishes: [] },
    { title: 'Menu6', dishes: [] },
    { title: 'Menu7', dishes: [] },
    { title: 'Menu8', dishes: [] },
    { title: 'Menu9', dishes: [] },
    { title: 'Menu10', dishes: [] },
    { title: 'Menu11', dishes: [] },
    { title: 'Menu12', dishes: [] },
    { title: 'Menu13', dishes: [] },
    { title: 'Menu14', dishes: [] }
  ];

  selectedMenu: Menu | null = null;

  constructor(private router: Router) {}

  goToMenuPlanner(menu: Menu){
    this.router.navigate(['menuplaner'], { state: { menu }})
  }

  selectMenu(menu: Menu): void {
    if(menu != this.selectedMenu) {
      this.selectedMenu = menu;
    }else{
      this.selectedMenu = null; // Deselect if the same menu is clicked again
    }
    console.log('Selected Menu:', this.selectedMenu);
  }

  removeMenu(menu: Menu) {
    this.Menus = this.Menus.filter(m => m !== menu)
  }
}
