import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

interface Dish {
  title: string;
}

@Component({
  selector: 'app-menu-planner',
  imports: [
    FormsModule
  ],
  templateUrl: './menu-planner.html',
  styleUrl: './menu-planner.css'
})
export class MenuPlanner {
  menuTitle: string = '';
  selectedDishes: Dish[] = [
    { title: 'Spaghetti Bolognese' },
    { title: 'Caesar Salad' },
    { title: 'Grilled Chicken' },
    { title: 'Vegetable Stir Fry' },
    { title: 'Beef Stroganoff' },
    { title: 'Fish Tacos' },
    { title: 'Pumpkin Soup' },
    { title: 'Lasagna' }
  ];
  unselectedDishes: Dish[] = [
    { title: 'Pizza Margherita' },
    { title: 'Schnitzel' },
    { title: 'Tomato Soup' },
    { title: 'Chicken Curry' },
    { title: 'Greek Salad' },
    { title: 'Pasta Carbonara' },
    { title: 'Falafel Wrap' },
    { title: 'Mushroom Risotto' },
    { title: 'Tuna Sandwich' }
  ];

  toggleDish(dish: Dish, selected: boolean){
    if(selected){
      this.selectedDishes = this.selectedDishes.filter(d => d !== dish);
      this.unselectedDishes.push(dish);
    }else{
      this.unselectedDishes = this.unselectedDishes.filter(d => d !== dish);
      this.selectedDishes.push(dish);
    }
  }
}
