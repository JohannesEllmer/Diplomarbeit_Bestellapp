// ... deine Imports bleiben gleich
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  deletingId: string | null = null;

  showDeleteDialog = false;
  dishToDelete: Dish | null = null;

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

    this.dishes
      .getDishes()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingDishes = false))
      )
      .subscribe({
        next: (all: Dish[]) => {
          const selectedIds = new Set(
            (this.selectedDishes ?? [])
              .map(d => (d?.id ?? '').toString().trim())
              .filter(id => UUID_RE.test(id))
          );

          this.unselectedDishes = (all ?? []).filter(d => !selectedIds.has(d.id));
        },
        error: (err: unknown) => {
          console.error('[MenuPlanner] load dishes failed:', err);
          this.loadError = 'Gerichte konnten nicht geladen werden.';
          this.unselectedDishes = [];
        }
      });
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

      if (this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id) && UUID_RE.test(dish.id)) {
        this.mealPlans.removeDish(this.menu.id, dish.id).subscribe({
          error: (e) => console.error('[MenuPlanner] removeDish failed:', e),
        });
      }
    } else {
      this.unselectedDishes = (this.unselectedDishes ?? []).filter(d => d.id !== dish.id);
      if (!this.selectedDishes.some(d => d.id === dish.id)) {
        this.selectedDishes = [{ ...dish, available: dish.available !== false }, ...(this.selectedDishes ?? [])];
      }

      if (this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id) && UUID_RE.test(dish.id)) {
        this.mealPlans.addDish(this.menu.id, dish.id).subscribe({
          error: (e) => console.error('[MenuPlanner] addDish failed:', e),
        });
      }
    }
  }

  drop(event: CdkDragDrop<Dish[]>): void {
    if (!event?.container?.data) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const prev = event.previousContainer.data;
    const next = event.container.data;

    const moved = prev[event.previousIndex];
    transferArrayItem(prev, next, event.previousIndex, event.currentIndex);

    if (this.menu?.id && this.menu.id !== 'new' && moved?.id && UUID_RE.test(this.menu.id) && UUID_RE.test(moved.id)) {
      const movedToSelected = event.container.id === 'selectedDishesList';
      const call$ = movedToSelected
        ? this.mealPlans.addDish(this.menu.id, moved.id)
        : this.mealPlans.removeDish(this.menu.id, moved.id);

      call$.subscribe({
        error: (e) => console.error('[MenuPlanner] drop sync failed:', e),
      });
    }
  }

  onTitleChange(value: string): void {
    this.menuTitle = (value ?? '').toString();
    if (this.menuTitle.trim()) this.titleError = '';
  }

  private buildDishIds(): string[] {
    return (this.selectedDishes ?? [])
      .map(d => (d?.id ?? '').toString().trim())
      .filter(id => UUID_RE.test(id));
  }

  toggleAvailable(dish: Dish, ev?: Event): void {
    ev?.stopPropagation();
    if (!dish?.id) return;

    const id = dish.id;
    const nextAvailable = !(dish.available !== false);

    this.selectedDishes = (this.selectedDishes ?? []).map(d =>
      d.id === id ? { ...d, available: nextAvailable } : d
    );

    if (this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id) && UUID_RE.test(id)) {
      this.mealPlans.setDishDisabled(this.menu.id, id, !nextAvailable).subscribe({
        error: (e) => console.error('[MenuPlanner] setDishDisabled failed:', e),
      });
    }
  }

  openDeleteDialog(dish: Dish, ev?: Event): void {
    ev?.stopPropagation();
    if (!dish?.id) return;

    this.dishToDelete = dish;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.dishToDelete = null;
  }

  confirmDelete(): void {
    const dish = this.dishToDelete;
    if (!dish?.id) {
      this.cancelDelete();
      return;
    }

    this.saveError = null;
    this.deletingId = dish.id;

    const prevSelected = [...this.selectedDishes];
    const prevUnselected = [...this.unselectedDishes];

    this.selectedDishes = (this.selectedDishes ?? []).filter(d => d.id !== dish.id);
    this.unselectedDishes = (this.unselectedDishes ?? []).filter(d => d.id !== dish.id);

    const menuIdOk = this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id);
    const dishIdOk = UUID_RE.test(dish.id);

    if (menuIdOk && dishIdOk) {
      this.mealPlans.removeDish(this.menu.id, dish.id).subscribe({
        error: (e) => console.error('[MenuPlanner] removeDish before delete failed:', e),
      });
    }

    this.dishes.deleteDish(dish.id)
      .pipe(finalize(() => {
        this.deletingId = null;
        this.cancelDelete(); 
      }))
      .subscribe({
        next: () => {},
        error: (err) => {
          console.error('[MenuPlanner] deleteDish failed:', err);

          this.selectedDishes = prevSelected;
          this.unselectedDishes = prevUnselected;

          this.saveError = 'Gericht konnte nicht gelöscht werden.';
        }
      });
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

    const req$ =
      this.menu?.id && this.menu.id !== 'new'
        ? this.mealPlans.update(this.menu.id, { title: trimmedTitle })
        : this.mealPlans.create({ title: trimmedTitle, dishIds: this.buildDishIds() });

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
