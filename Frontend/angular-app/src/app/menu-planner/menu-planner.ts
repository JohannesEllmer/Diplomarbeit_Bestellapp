import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  DragDropModule
} from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { Dish } from '../../models/dish.model';
import { MealPlan } from '../../models/meal-plan.model';

import { MealPlanService } from '../services/menu-planner/meal-plan-service';
import { DishService } from '../services/dish-editor/dish-editor';

@Component({
  selector: 'app-menu-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './menu-planner.html',
  styleUrls: ['./menu-planner.css']
})
export class MenuPlanner implements OnInit, OnDestroy {
  menuTitle = '';
  titleError = '';

  selectedDishes: Dish[] = [];
  unselectedDishes: Dish[] = [];

  menu: MealPlan = { id: 'new', title: '', dishes: [] };

  private isDragging = false;
  loadingDishes = false;
  saving = false;

  loadError: string | null = null;
  saveError: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private mealPlans: MealPlanService,
    private dishes: DishService
  ) {}

  ngOnInit(): void {
    const stateMenu = history.state.menu as MealPlan | undefined;

    if (stateMenu?.id) {
      this.menu = { ...stateMenu };
      this.menuTitle = stateMenu.title ?? '';
      this.selectedDishes = [...(stateMenu.dishes ?? [])];
    } else {
      this.menu = { id: 'new', title: '', dishes: [] };
      this.menuTitle = '';
      this.selectedDishes = [];
    }

    this.loadAllDishesAndSplit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllDishesAndSplit(): void {
    this.loadingDishes = true;
    this.loadError = null;

   this.dishes.getDishes()
  .pipe(
    takeUntil(this.destroy$),
    finalize(() => (this.loadingDishes = false))
  )
  .subscribe({
    next: (all: Dish[]) => {
      const selectedIds = new Set((this.selectedDishes ?? []).map((d: Dish) => d.id));
      this.unselectedDishes = (all ?? []).filter((d: Dish) => !selectedIds.has(d.id));
    },
    error: (err: unknown) => {
      console.error('[MenuPlanner] load dishes failed:', err);
      this.loadError = 'Gerichte konnten nicht geladen werden.';
      this.unselectedDishes = [];
    }
  });

  }

  drop(event: CdkDragDrop<Dish[]>): void {
    if (!event?.container?.data) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => (this.isDragging = false));
  }

  onDishClick(dish: Dish, isSelectedList: boolean): void {
    if (this.isDragging) return;
    this.toggleDishById(dish, isSelectedList);
  }

  private toggleDishById(dish: Dish, fromSelectedList: boolean): void {
    if (!dish?.id) return;

    if (fromSelectedList) {
      this.selectedDishes = (this.selectedDishes ?? []).filter(d => d.id !== dish.id);
      if (!this.unselectedDishes.some(d => d.id === dish.id)) {
        this.unselectedDishes = [dish, ...(this.unselectedDishes ?? [])];
      }
    } else {
      this.unselectedDishes = (this.unselectedDishes ?? []).filter(d => d.id !== dish.id);
      if (!this.selectedDishes.some(d => d.id === dish.id)) {
        this.selectedDishes = [dish, ...(this.selectedDishes ?? [])];
      }
    }
  }

  onTitleChange(value: string): void {
    this.menuTitle = (value ?? '').toString();
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

    const payload: MealPlan = {
      ...this.menu,
      title: trimmedTitle,
      dishes: [...(this.selectedDishes ?? [])]
    };

    const req$ =
      payload.id && payload.id !== 'new'
        ? this.mealPlans.update(payload.id, payload)
        : this.mealPlans.create(payload);

    req$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (saved) => {
          this.router.navigate(['/menu-manager'], { state: { menu: saved } });
        },
        error: (err) => {
          console.error('[MenuPlanner] save failed:', err);
          this.saveError = 'Das Menü konnte nicht gespeichert werden.';
        }
      });
  }

  goToDishDesigner(): void {
    this.router.navigate(['/gericht-verwaltung']);
  }
}
