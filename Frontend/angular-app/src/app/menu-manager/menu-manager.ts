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
      title: 'Tagesmenü',
      dishes: [
        {
          name: 'Kürbiscremesuppe',
          description: 'Cremige Suppe aus Hokkaido-Kürbis mit Kernöl',
          price: 6.50
        },
        {
          name: 'Wiener Schnitzel',
          description: 'Klassisches Kalbsschnitzel mit Kartoffelsalat',
          price: 18.90
        },
        {
          name: 'Apfelstrudel',
          description: 'Hausgemachter Strudel mit Vanillesoße',
          price: 6.90
        }
      ]
    },
    {
      title: 'Vegetarisches Menü',
      dishes: [
        {
          name: 'Gemüsesuppe',
          description: 'Klare Suppe mit Frühlingsgemüse',
          price: 5.90
        },
        {
          name: 'Spinatknödel',
          description: 'Hausgemachte Knödel mit Salbeibutter',
          price: 14.90
        },
        {
          name: 'Käsespätzle',
          description: 'Mit verschiedenen Käsesorten und Röstzwiebeln',
          price: 13.50
        },
        {
          name: 'Gemüsestrudel',
          description: 'Mit mediterranem Grillgemüse',
          price: 12.90
        },
        {
          name: 'Gemüsestrudel',
          description: 'Mit mediterranem Grillgemüse',
          price: 12.90
        }
      ]
    },
    {
      title: 'Bayerische Spezialitäten',
      dishes: [
        {
          name: 'Leberkäse',
          description: 'Mit Spiegelei und Kartoffelsalat',
          price: 11.90
        },
        {
          name: 'Schweinebraten',
          description: 'Mit Knödel und Sauerkraut',
          price: 16.90
        },
        {
          name: 'Obatzda',
          description: 'Mit Brezel und Radieschen',
          price: 8.90
        },
        {
          name: 'Weißwurst',
          description: 'Mit süßem Senf und Brezel',
          price: 7.90
        },
        {
          name: 'Weißwurst',
          description: 'Mit süßem Senf und Brezel',
          price: 7.90
        },
        {
          name: 'Weißwurst',
          description: 'Mit süßem Senf und Brezel',
          price: 7.90
        }
      ]
    },
    {
      title: 'Fischspezialitäten',
      dishes: [
        {
          name: 'Forelle Müllerin',
          description: 'Mit Petersilienkartoffeln',
          price: 19.90
        },
        {
          name: 'Lachs vom Grill',
          description: 'Mit Blattspinat und Risotto',
          price: 21.90
        },
        {
          name: 'Fischsuppe',
          description: 'Mit verschiedenen Meeresfischen',
          price: 8.90
        }
      ]
    },
    {
      title: 'Kindergerichte',
      dishes: [
        {
          name: 'Spätzle mit Soße',
          description: 'Mit Rahmsauce',
          price: 7.90
        },
        {
          name: 'Chicken Nuggets',
          description: 'Mit Pommes und Ketchup',
          price: 8.90
        },
        {
          name: 'Fischstäbchen',
          description: 'Mit Kartoffelpüree',
          price: 7.90
        }
      ]
    },
    {
      title: 'Mediterranes Menü',
      dishes: [
        {
          name: 'Bruschetta',
          description: 'Mit frischen Tomaten und Basilikum',
          price: 7.90
        },
        {
          name: 'Pasta Bolognese',
          description: 'Mit hausgemachter Sauce',
          price: 13.90
        },
        {
          name: 'Tiramisu',
          description: 'Nach Original-Rezept',
          price: 6.90
        }
      ]
    },
    {
      title: 'Salate',
      dishes: [
        {
          name: 'Cesar Salat',
          description: 'Mit Hähnchenbruststreifen',
          price: 14.90
        },
        {
          name: 'Griechischer Salat',
          description: 'Mit Feta und Oliven',
          price: 12.90
        },
        {
          name: 'Kartoffelsalat',
          description: 'Nach Hausrezept',
          price: 5.90
        }
      ]
    },
    {
      title: 'Grillspezialitäten',
      dishes: [
        {
          name: 'Rumpsteak',
          description: 'Mit Kräuterbutter und Pommes',
          price: 24.90
        },
        {
          name: 'Spareribs',
          description: 'Mit BBQ-Sauce und Wedges',
          price: 18.90
        },
        {
          name: 'Grillplatte',
          description: 'Verschiedene Fleischsorten mit Gemüse',
          price: 26.90
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
