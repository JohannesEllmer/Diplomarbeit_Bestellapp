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

import { MenuItem } from '../../models/menu-item.model';
import { MealPlan } from '../../models/meal-plan.model';

import { MealPlanService } from '../services/menu-planner/meal-plan-service';
import { MenuItemsApiService } from '../services/menu/menu-item-service';

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

  selectedDishes: MenuItem[] = [];
  unselectedDishes: MenuItem[] = [];

  menu: MealPlan = { id: 'new', title: '', menuItems: [] };

  private isDragging = false;
  loadingDishes = false;
  saving = false;

  loadError: string | null = null;
  saveError: string | null = null;

  deletingId: string | null = null;

  showDeleteDialog = false;
  dishToDelete: MenuItem | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private mealPlans: MealPlanService,
    private menuItems: MenuItemsApiService
  ) {}

  ngOnInit(): void {
    const stateMenu = history.state.menu as MealPlan | undefined;

    if (stateMenu?.id) {
      const rawItems =
        Array.isArray((stateMenu as any).menuItems) ? (stateMenu as any).menuItems :
        Array.isArray((stateMenu as any).menu_items) ? (stateMenu as any).menu_items :
        Array.isArray((stateMenu as any).dishes) ? (stateMenu as any).dishes :
        [];

      this.menu = {
        id: String(stateMenu.id),
        title: stateMenu.title ?? '',
        menuItems: rawItems
      };

      this.menuTitle = this.menu.title ?? '';
      this.selectedDishes = [...(this.menu.menuItems ?? [])];
    } else {
      this.menu = { id: 'new', title: '', menuItems: [] };
      this.menuTitle = '';
      this.selectedDishes = [];
    }

    this.loadAllMenuItemsAndSplit();

    // ✅ Wenn man aus DishEditor zurückkommt (state.menuItem), aktualisieren wir die Listen
    const edited = history.state.menuItem as MenuItem | undefined;
    if (edited?.id && UUID_RE.test(edited.id)) {
      this.applyUpdatedMenuItem(edited);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAllMenuItemsAndSplit(): void {
    this.loadingDishes = true;
    this.loadError = null;

    this.menuItems
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingDishes = false))
      )
      .subscribe({
        next: (all: MenuItem[]) => {
          const selectedIds = new Set(
            (this.selectedDishes ?? [])
              .map(x => String(x?.id ?? '').trim())
              .filter(id => UUID_RE.test(id))
          );

          this.unselectedDishes = (all ?? []).filter(mi => !selectedIds.has(mi.id));
        },
        error: (err: unknown) => {
          console.error('[MenuPlanner] load menu-items failed:', err);
          this.loadError = 'Menu-Items konnten nicht geladen werden.';
          this.unselectedDishes = [];
        }
      });
  }

  // -------------------------
  // Dragging
  // -------------------------
  onDragStarted(): void {
    this.isDragging = true;
  }

  onDragEnded(): void {
    setTimeout(() => (this.isDragging = false));
  }

  onDishClick(item: MenuItem, isSelectedList: boolean): void {
    if (this.isDragging) return;
    this.toggleById(item, isSelectedList);
  }

  private toggleById(item: MenuItem, fromSelectedList: boolean): void {
    if (!item?.id) return;

    const menuIdOk = this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id);
    const itemIdOk = UUID_RE.test(item.id);

    if (fromSelectedList) {
      this.selectedDishes = (this.selectedDishes ?? []).filter(x => x.id !== item.id);

      if (!this.unselectedDishes.some(x => x.id === item.id)) {
        this.unselectedDishes = [item, ...(this.unselectedDishes ?? [])];
      }

      if (menuIdOk && itemIdOk) {
        this.mealPlans.removeMenuItem(this.menu.id, item.id).subscribe({
          error: (e) => console.error('[MenuPlanner] removeMenuItem failed:', e),
        });
      }
    } else {
      this.unselectedDishes = (this.unselectedDishes ?? []).filter(x => x.id !== item.id);

      if (!this.selectedDishes.some(x => x.id === item.id)) {
        this.selectedDishes = [{ ...item, available: item.available !== false }, ...(this.selectedDishes ?? [])];
      }

      if (menuIdOk && itemIdOk) {
        this.mealPlans.addMenuItem(this.menu.id, item.id).subscribe({
          error: (e) => console.error('[MenuPlanner] addMenuItem failed:', e),
        });
      }
    }
  }

  drop(event: CdkDragDrop<MenuItem[]>): void {
    if (!event?.container?.data) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const prev = event.previousContainer.data;
    const next = event.container.data;

    const moved = prev[event.previousIndex];
    transferArrayItem(prev, next, event.previousIndex, event.currentIndex);

    const menuIdOk = this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id);
    const itemIdOk = moved?.id && UUID_RE.test(moved.id);

    if (menuIdOk && itemIdOk) {
      const movedToSelected = event.container.id === 'selectedDishesList';
      const call$ = movedToSelected
        ? this.mealPlans.addMenuItem(this.menu.id, moved.id)
        : this.mealPlans.removeMenuItem(this.menu.id, moved.id);

      call$.subscribe({
        error: (e) => console.error('[MenuPlanner] drop sync failed:', e),
      });
    }
  }

  onTitleChange(value: string): void {
    this.menuTitle = (value ?? '').toString();
    if (this.menuTitle.trim()) this.titleError = '';
  }

  // -------------------------
  // Availability (disabled im MealPlan)
  // -------------------------
  toggleAvailable(item: MenuItem, ev?: Event): void {
    ev?.stopPropagation();
    if (!item?.id) return;

    const id = item.id;
    const nextAvailable = !(item.available === false);

    this.selectedDishes = (this.selectedDishes ?? []).map(x =>
      x.id === id ? { ...x, available: nextAvailable } : x
    );

    const menuIdOk = this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id);
    const itemIdOk = UUID_RE.test(id);

    if (menuIdOk && itemIdOk) {
      this.mealPlans.setMenuItemDisabled(this.menu.id, id, !nextAvailable).subscribe({
        error: (e) => console.error('[MenuPlanner] setMenuItemDisabled failed:', e),
      });
    }
  }

  // -------------------------
  // ✅ Edit Button → DishEditor mit Prefill & Update
  // -------------------------
  editDish(item: MenuItem, ev?: Event): void {
    ev?.stopPropagation();
    if (!item?.id) return;

    // ✅ DishEditor erkennt: id vorhanden → lädt & macht PATCH beim Speichern
    this.router.navigate(['/gericht-verwaltung'], {
      state: { dish: item, returnTo: '/menuplaner', returnState: { menu: this.menu } }
    });
  }

  // -------------------------
  // Delete dialog
  // -------------------------
  openDeleteDialog(item: MenuItem, ev?: Event): void {
    ev?.stopPropagation();
    if (!item?.id) return;

    this.dishToDelete = item;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.dishToDelete = null;
  }

  confirmDelete(): void {
    const item = this.dishToDelete;
    if (!item?.id) {
      this.cancelDelete();
      return;
    }

    this.saveError = null;
    this.deletingId = item.id;

    const prevSelected = [...this.selectedDishes];
    const prevUnselected = [...this.unselectedDishes];

    // ✅ Sofort UI updaten
    this.selectedDishes = (this.selectedDishes ?? []).filter(x => x.id !== item.id);
    this.unselectedDishes = (this.unselectedDishes ?? []).filter(x => x.id !== item.id);

    // ✅ Backend Delete (kann FK-Fix jetzt)
    this.menuItems.delete(item.id)
      .pipe(finalize(() => {
        this.deletingId = null;
        this.cancelDelete();
      }))
      .subscribe({
        next: () => {},
        error: (err) => {
          console.error('[MenuPlanner] deleteMenuItem failed:', err);

          // rollback UI
          this.selectedDishes = prevSelected;
          this.unselectedDishes = prevUnselected;

          const msg = (err as any)?.error?.message;
          this.saveError =
            msg === 'MENU_ITEM_IN_USE'
              ? 'Dieses Gericht kann nicht gelöscht werden, weil es bereits in Bestellungen verwendet wurde.'
              : 'Menu-Item konnte nicht gelöscht werden.';
        }
      });
  }

  private buildMenuItemIds(): string[] {
    return (this.selectedDishes ?? [])
      .map(x => String(x?.id ?? '').trim())
      .filter(id => UUID_RE.test(id));
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
        : this.mealPlans.create({ title: trimmedTitle, menuItemIds: this.buildMenuItemIds() });

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
    this.router.navigate(['/gericht-verwaltung'], { state: { returnTo: '/menuplaner', returnState: { menu: this.menu } } });
  }

  private applyUpdatedMenuItem(updated: MenuItem): void {
    this.selectedDishes = (this.selectedDishes ?? []).map(x => x.id === updated.id ? { ...x, ...updated } : x);
    this.unselectedDishes = (this.unselectedDishes ?? []).map(x => x.id === updated.id ? { ...x, ...updated } : x);
  }
}
