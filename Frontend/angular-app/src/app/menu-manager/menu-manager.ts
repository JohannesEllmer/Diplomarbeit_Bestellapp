import { Component } from '@angular/core';
import { MealPlan } from '../../models/meal-plan.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-manager',
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.css'
})
export class MenuManager {
  Menus: MealPlan[] = [
    {
      id: '0',
      title: 'Tagesmenü',
      dishes: [
        {
          id: '1',
          name: 'Kürbiscremesuppe',
          description: 'Cremige Suppe aus Hokkaido-Kürbis mit Kernöl',
          price: 6.50
        },
        {
          id: '2',
          name: 'Wiener Schnitzel',
          description: 'Klassisches Kalbsschnitzel mit Kartoffelsalat',
          price: 18.90
        },
        {
          id: '3',
          name: 'Apfelstrudel',
          description: 'Hausgemachter Strudel mit Vanillesoße',
          price: 6.90
        }
      ]
    },
    {
      id: '1',
      title: 'Vegetarisches Menü',
      dishes: [
        {
          id: '1',
          name: 'Gemüsesuppe',
          description: 'Klare Suppe mit Frühlingsgemüse',
          price: 5.90
        },
        {
          id:'2',
          name: 'Spinatknödel',
          description: 'Hausgemachte Knödel mit Salbeibutter',
          price: 14.90
        },

      ]
    },
    {
      id: '2',
      title: 'Bayerische Spezialitäten',
      dishes: [
        {
          id: '1',
          name: 'Leberkäse',
          description: 'Mit Spiegelei und Kartoffelsalat',
          price: 11.90
        },
        {
          id: '2',
          name: 'Schweinebraten',
          description: 'Mit Knödel und Sauerkraut',
          price: 16.90
        },
        {
          id: '3',
          name: 'Obatzda',
          description: 'Mit Brezel und Radieschen',
          price: 8.90
        }

      ]
    }




  ];

  selectedMenu: MealPlan | null = null;

  constructor(private router: Router) {}

  goToMenuPlanner(menu: MealPlan){
    this.router.navigate(['menuplaner'], { state: { menu }})
  }

  selectMenu(menu: MealPlan): void {
    if(menu != this.selectedMenu) {
      this.selectedMenu = menu;
    }else{
      this.selectedMenu = null; // Deselect if the same menu is clicked again
    }
    console.log('Selected Menu:', this.selectedMenu);
  }

  removeMenu(menu: MealPlan) {
    this.Menus = this.Menus.filter(m => m !== menu)
  }
}
