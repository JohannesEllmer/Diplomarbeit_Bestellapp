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
import { MenuService } from '../services/menu-planner/menu-planner';

@Component({
  selector: 'app-menu-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './menu-planner.html',
  styleUrls: ['./menu-planner.css']
})
export class MenuPlanner implements OnInit {
  menuTitle = '';
  titleError = '';

  selectedDishes: Dish[] = [];
  unselectedDishes: Dish[] = [];

  // aktuelles Menü
  menu: MealPlan = { id: 'new', title: '', dishes: [] };

  // Flags
  private isDragging = false;
  saving = false;
  saveError: string | null = null;

  constructor(
    private router: Router,
    private menuService: MenuService
  ) {}

  ngOnInit(): void {
    const stateMenu = history.state.menu as MealPlan | undefined;

    if (stateMenu?.id) {
      // bestehendes Menü bearbeiten
      this.menu = { ...stateMenu };
      this.menuTitle = stateMenu.title ?? '';
      this.selectedDishes = [...(stateMenu.dishes ?? [])];
    } else {
      // neues Menü
      this.menu = { id: 'new', title: '', dishes: [] };
      this.menuTitle = '';
      this.selectedDishes = [];
    }

    this.initMockUnselectedDishes();
  }

  /** Mock-Liste für unselektierte Gerichte (später durch echten DishService ersetzen) */
  private initMockUnselectedDishes(): void {
    const mockAllDishes: Dish[] = [
      { id: '1', name: 'Spaghetti Bolognese' },
      { id: '2', name: 'Pizza Margherita' },
      { id: '3', name: 'Gemischter Salat' },
      { id: '4', name: 'Kartoffelsuppe' },
      { id: '5', name: 'Tiramisu' }
    ];

    const selectedIds = new Set(this.selectedDishes.map(d => d.id));
    this.unselectedDishes = mockAllDishes.filter(d => !selectedIds.has(d.id));
  }

  drop(event: CdkDragDrop<Dish[]>): void {
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

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => (this.isDragging = false));
  }

  onDishClick(dish: Dish, selected: boolean): void {
    if (this.isDragging) return;
    this.toggleDish(dish, selected);
  }

  toggleDish(dish: Dish, selected: boolean): void {
    if (selected) {
      this.selectedDishes = this.selectedDishes.filter(d => d !== dish);
      this.unselectedDishes.unshift(dish);
    } else {
      this.unselectedDishes = this.unselectedDishes.filter(d => d !== dish);
      this.selectedDishes.unshift(dish);
    }
  }

  onTitleChange(value: string): void {
    this.menuTitle = value;
    if (this.menuTitle.trim()) this.titleError = '';
  }

  saveMenu(): void {
    const trimmedTitle = this.menuTitle.trim();

    if (!trimmedTitle) {
      this.titleError = 'Bitte einen Titel für das Menü eingeben.';
      return;
    }

    this.titleError = '';
    this.saveError = null;
    this.saving = true;

    this.menu = {
      ...this.menu,
      title: trimmedTitle,
      dishes: this.selectedDishes
    };

    this.menuService.saveMenu(this.menu).subscribe({
      next: (savedMenu: MealPlan) => {
        this.saving = false;
        this.router.navigate(['/menu-manager'], { state: { menu: savedMenu } });
      },
      error: (err) => {
        console.error('Fehler beim Speichern des Menüs:', err);
        this.saving = false;
        this.saveError = 'Das Menü konnte nicht gespeichert werden.';
      }
    });
  }

  /** ✅ FEHLTE: Template ruft das auf */
  goToDishDesigner(): void {
    this.router.navigate(['/gericht-verwaltung']);
  }
}
