import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dish } from '../../models/dish.model';
import { Menu } from '../../models/menu.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-planner',
  imports: [
    FormsModule
  ],
  templateUrl: './menu-planner.html',
  styleUrl: './menu-planner.css'
})
export class MenuPlanner implements OnInit {
  menuTitle: string = '';
  selectedDishes: Dish[] = [
    { name: 'Spaghetti Bolognese' },
    { name: 'Caesar Salad' },
    { name: 'Grilled Chicken' },
    { name: 'Vegetable Stir Fry' },
    { name: 'Beef Stroganoff' },
    { name: 'Fish Tacos' },
    { name: 'Pumpkin Soup' },
    { name: 'Lasagna' }
  ];
  unselectedDishes: Dish[] = [
    { name: 'Pizza Margherita' },
    { name: 'Schnitzel' },
    { name: 'Tomato Soup' },
    { name: 'Chicken Curry' },
    { name: 'Greek Salad' },
    { name: 'Pasta Carbonara' },
    { name: 'Falafel Wrap' },
    { name: 'Mushroom Risotto' },
    { name: 'Tuna Sandwich' }
  ];
  menu: Menu = { title: '', dishes: [] };

  constructor(private router: Router) {}

  ngOnInit() {
    const menu = history.state.menu as Menu;
    if(menu && menu.title) {
      this.menuTitle = menu.title;
    }
  }

  toggleDish(dish: Dish, selected: boolean){
    if(selected){
      this.selectedDishes = this.selectedDishes.filter(d => d !== dish);
      this.unselectedDishes.push(dish);
    }else{
      this.unselectedDishes = this.unselectedDishes.filter(d => d !== dish);
      this.selectedDishes.push(dish);
    }
  }

  saveMenu() {
    this.menu.title = this.menuTitle;
    this.menu.dishes = this.selectedDishes;
    this.router.navigate(['/menu-manager'], { state: {menu: this.menu } });
  }

  goToDishDesigner(){
    this.router.navigate(['/gericht-verwaltung']);
  }
}
