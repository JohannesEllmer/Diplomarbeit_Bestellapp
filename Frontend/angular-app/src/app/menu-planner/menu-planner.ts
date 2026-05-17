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
  // Titel des aktuellen Menüs im Editor
  menuTitle = '';
  titleError = '';

  // Ausgewählte und noch nicht ausgewählte Gerichte
  selectedDishes: MenuItem[] = [];
  unselectedDishes: MenuItem[] = [];

  // Das aktuell geladene Menüobjekt
  menu: MealPlan = { id: 'new', title: '', menuItems: [] };

  private isDragging = false;
  loadingDishes = false;
  saving = false;

  loadError: string | null = null;
  saveError: string | null = null;

  deletingId: string | null = null;

  showDeleteDialog = false;
  dishToDelete: MenuItem | null = null;

  // Subject zum Aufräumen bei Zerstörung der Komponente
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private mealPlans: MealPlanService,
    private menuItems: MenuItemsApiService
  ) {}

  // Initialisiert die Seite und befüllt den Editor mit einem bestehenden Menü, falls vorhanden.
  ngOnInit(): void {
    const stateMenu = history.state.menu as MealPlan | undefined;

    if (stateMenu?.id) {
      // Menüobjekt aus dem Navigationszustand übernehmen und mögliche Varianten der Items-Felder abdecken
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

    // Validiert die ID des geladenen MenuItem
    const edited = history.state.menuItem as MenuItem | undefined;
    if (edited?.id && UUID_RE.test(edited.id)) {
      this.applyUpdatedMenuItem(edited);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Lädt alle Gerichte und teilt sie in ausgewählte und nicht ausgewählte Gruppen auf.
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

  // Verschiebt ein Gericht zwischen ausgewählter und nicht ausgewählter Liste.
  private toggleById(item: MenuItem, fromSelectedList: boolean): void {
    if (!item?.id) return;

    const menuIdOk = this.menu?.id && this.menu.id !== 'new' && UUID_RE.test(this.menu.id);
    const itemIdOk = UUID_RE.test(item.id);

    if (fromSelectedList) {
      this.selectedDishes = (this.selectedDishes ?? []).filter(x => x.id !== item.id);

      // Item zurück in die nicht ausgewählte Liste verschieben
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

      // Item in die ausgewählte Liste übernehmen und bei Bedarf als verfügbar markieren
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

  // Behandelt Drag & Drop zwischen den beiden Listen und synchronisiert verschobene Items mit dem Server.
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

  // Schaltet die Verfügbarkeit eines Gerichts im Menü um
  toggleAvailable(item: MenuItem, ev?: Event): void {
    ev?.stopPropagation();
    if (!item?.id) return;

    const id = item.id;
    const nextAvailable = item.available;

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

  editDish(item: MenuItem, ev?: Event): void {
    ev?.stopPropagation();
    if (!item?.id) return;
    this.router.navigate(['/gericht-verwaltung'], {
      state: { dish: item, returnTo: '/menuplaner', returnState: { menu: this.menu } }
    });
  }

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

  // Führt das Löschen eines Gerichts aus, nachdem die Bestätigung erfolgt ist
  confirmDelete(): void {
    const item = this.dishToDelete;
    if (!item?.id) {
      this.cancelDelete();
      return;
    }

    console.log('[MenuPlanner] confirmDelete clicked for id:', item.id);

    this.saveError = null;
    this.deletingId = item.id;

    const prevSelected = [...this.selectedDishes];
    const prevUnselected = [...this.unselectedDishes];

    // Optimistische UI: das Gericht sofort entfernen, solange der Löschauftrag läuft
    this.selectedDishes = (this.selectedDishes ?? []).filter(x => x.id !== item.id);
    this.unselectedDishes = (this.unselectedDishes ?? []).filter(x => x.id !== item.id);

    this.menuItems.delete(String(item.id))
      .pipe(finalize(() => {
        this.deletingId = null;
        this.cancelDelete();
      }))
      .subscribe({
        next: () => {
          console.log('[MenuPlanner] delete OK');
        },
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

  // Baut aus den ausgewählten Gerichten eine Liste gültiger IDs für die Speicherung.
  private buildMenuItemIds(): string[] {
    return (this.selectedDishes ?? [])
      .map(x => String(x?.id ?? '').trim())
      .filter(id => UUID_RE.test(id));
  }

  // Speichert den Menüplan mit Titel und ausgewählten Gerichten
  saveMenu(): void {
    const trimmedTitle = this.menuTitle.trim();

    if (!trimmedTitle) {
      this.titleError = 'Bitte einen Titel für das Menü eingeben.';
      return;
    }

    this.titleError = '';
    this.saveError = null;
    this.saving = true;

    const menuItemIds = this.buildMenuItemIds();

    const req$ =
      this.menu?.id && this.menu.id !== 'new'
        ? this.mealPlans.update(this.menu.id, { title: trimmedTitle, menuItemIds })
        : this.mealPlans.create({ title: trimmedTitle, menuItemIds });

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

  // Öffnet den Gerichte-Editor und übergibt aktuellen Rückkehr-Zustand
  goToDishDesigner(): void {
    this.router.navigate(['/gericht-verwaltung'], { state: { returnTo: '/menuplaner', returnState: { menu: this.menu } } });
  }

  // Aktualisiert die Anzeige eines bearbeiteten Gerichts in beiden Listen
  private applyUpdatedMenuItem(updated: MenuItem): void {
    this.selectedDishes = (this.selectedDishes ?? []).map(x => x.id === updated.id ? { ...x, ...updated } : x);
    this.unselectedDishes = (this.unselectedDishes ?? []).map(x => x.id === updated.id ? { ...x, ...updated } : x);
  }
}
