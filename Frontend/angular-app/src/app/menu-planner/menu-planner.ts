import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  DragDropModule
} from '@angular/cdk/drag-drop';
import { Dish } from '../../models/dish.model';
import { MealPlan } from '../../models/meal-plan.model';

@Component({
  selector: 'app-menu-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './menu-planner.html',
  styleUrls: ['./menu-planner.css']
})
export class MenuPlanner implements OnInit {
  menuTitle = '';

  selectedDishes: Dish[] = [
    { name: 'Spaghetti Bolognese' },
    { name: 'Caesar Salad' },
    { name: 'Grilled Chicken' },
    { name: 'Vegetable Stir Fry' }
  ];
  unselectedDishes: Dish[] = [
    { name: 'Pizza Margherita' },
    { name: 'Schnitzel' },
    { name: 'Tomato Soup' },
    { name: 'Chicken Curry' }
  ];
  menu: MealPlan = { title: '', dishes: [] };

  constructor(private router: Router) {}

  ngOnInit() {
    const menu = history.state.menu as MealPlan;
    if (menu && menu.title) {
      this.menuTitle = menu.title;
      if (menu.dishes && menu.dishes.length) {
        this.selectedDishes = [...menu.dishes];
      }
    }
  }

  drop(event: CdkDragDrop<Dish[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }


  toggleDish(dish: Dish, selected: boolean) {
    if (selected) {
      this.selectedDishes = this.selectedDishes.filter(d => d !== dish);
      this.unselectedDishes.unshift(dish);
    } else {
      this.unselectedDishes = this.unselectedDishes.filter(d => d !== dish);
      this.selectedDishes.unshift(dish);
    }
  }

  saveMenu() {
    this.menu.title = this.menuTitle;
    this.menu.dishes = this.selectedDishes;
    this.router.navigate(['/menu-manager'], { state: { menu: this.menu } });
  }

  goToDishDesigner() {
    this.router.navigate(['/gericht-verwaltung']);
  }
}
