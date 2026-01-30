import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MenuItemComponent } from '../menu-item-component/menu-item-component';
import { MenuItem } from '../../models/menu-item.model';
import { MenuItemsApiService } from '../services/menu/menu-item-service';

@Component({
  selector: 'app-dish-editor',
  standalone: true,
  imports: [CommonModule, MenuItemComponent, FormsModule],
  templateUrl: './dish-editor.html',
  styleUrl: './dish-editor.css',
})
export class DishEditor implements OnInit {
  dish: MenuItem = {
    id: '0',
    name: '',
    description: '',
    price: 0,
    category: '',
    allergens: [],
    vegetarian: false,
    available: true,
    drink: '',
    dessert: '',
  };

  allergenTemp = '';
  imageTemp: string | ArrayBuffer | null = null;

  saving = false;
  saveError: string | null = null;

  // ✅ Rücksprung
  private returnTo = '/menuplaner';
  private returnState: any = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private menuItemsApi: MenuItemsApiService
  ) {}

  ngOnInit(): void {
    const st = history.state ?? {};

    // ✅ Falls vom MenuPlanner "Bearbeiten" gedrückt wurde:
    const prefill = st.dish as MenuItem | undefined;
    if (prefill?.id) {
      this.dish = {
        ...this.dish,
        ...prefill,
        id: String(prefill.id),
        price: Number((prefill as any).price ?? 0),
        allergens: Array.isArray(prefill.allergens) ? prefill.allergens : [],
        available: prefill.available !== false,
        vegetarian: !!prefill.vegetarian,
        drink: (prefill.drink ?? '') as any,
        dessert: (prefill.dessert ?? '') as any,
      };
    }

    // Rückweg merken
    this.returnTo = String(st.returnTo ?? this.returnTo);
    this.returnState = st.returnState ?? null;

    // Optional: wenn du IMMER frisch laden willst:
    // (empfohlen, falls im state unvollständig)
    if (this.dish?.id && this.dish.id !== '0' && this.dish.id !== 'new') {
      this.menuItemsApi.getById(this.dish.id).subscribe((full) => {
        if (!full) return;
        this.dish = { ...this.dish, ...full };
      });
    }
  }

  private validateDish(): string[] {
    const errors: string[] = [];

    const name = (this.dish.name ?? '').trim();
    const description = (this.dish.description ?? '').trim();
    const category = (this.dish.category ?? '').trim();
    const price = Number(this.dish.price);

    if (!name) errors.push('Name fehlt.');
    if (!description) errors.push('Beschreibung fehlt.');
    if (!category) errors.push('Kategorie fehlt.');
    if (!Number.isFinite(price) || price <= 0) errors.push('Preis muss größer als 0 sein.');

    return errors;
  }

  get isEditMode(): boolean {
    const id = String(this.dish?.id ?? '');
    return !!id && id !== '0' && id !== 'new';
  }

  get canSave(): boolean {
    return this.validateDish().length === 0 && !this.saving;
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.imageTemp = reader.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  addAllergen() {
    const allergen = this.allergenTemp?.trim();
    if (!allergen) return;

    const list = Array.isArray(this.dish.allergens) ? this.dish.allergens : [];
    if (!list.includes(allergen)) {
      this.dish = { ...this.dish, allergens: [...list, allergen] };
    }
    this.allergenTemp = '';
  }

  removeAllergen(allergen: string) {
    const list = Array.isArray(this.dish.allergens) ? this.dish.allergens : [];
    this.dish = { ...this.dish, allergens: list.filter(a => a !== allergen) };
  }

  onSave() {
    this.saveError = null;

    const validationErrors = this.validateDish();
    if (validationErrors.length > 0) {
      this.saveError = 'Bitte alle Felder korrekt ausfüllen: ' + validationErrors.join(' ');
      return;
    }

    this.saving = true;

    const itemToSave: MenuItem = {
      ...this.dish,
      name: (this.dish.name ?? '').trim(),
      description: (this.dish.description ?? '').trim(),
      category: (this.dish.category ?? '').trim(),
      price: Number(this.dish.price ?? 0),
      allergens: Array.isArray(this.dish.allergens) ? this.dish.allergens : [],
      available: this.dish.available !== false,
      vegetarian: !!this.dish.vegetarian,
      drink: (this.dish.drink ?? '').trim() || undefined,
      dessert: (this.dish.dessert ?? '').trim() || undefined,
    };

    // ✅ save() macht automatisch POST (neu) oder PATCH (edit) – je nach id
    this.menuItemsApi.save(itemToSave).subscribe({
      next: (saved) => {
        this.saving = false;
        this.dish = saved;

        // ✅ zurück + updated dish mitgeben
        this.router.navigate([this.returnTo], {
          state: { ...(this.returnState ?? {}), menuItem: saved }
        });
      },
      error: (err) => {
        console.error('Fehler beim Speichern:', err);
        this.saving = false;
        this.saveError = 'Das Menu-Item konnte nicht gespeichert werden.';
      },
    });
  }

  onCancel(): void {
    this.router.navigate([this.returnTo], { state: this.returnState ?? {} });
  }
}
