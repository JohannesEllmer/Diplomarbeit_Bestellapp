import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MenuItemComponent } from '../menu-item-component/menu-item-component';
import { MenuItem } from '../../models/menu-item.model';
import { Menu } from '../../models/menu.model';
import { DishService } from '../services/dish-editor/dish-editor';

@Component({
  selector: 'app-dish-editor',
  imports: [MenuItemComponent, FormsModule],
  templateUrl: './dish-editor.html',
  styleUrl: './dish-editor.css'
})
export class DishEditor {
  dish: MenuItem = {
    id: '0',
    name: '',
    description: '',
    price: 0,
    category: '',
    allergens: [],
    vegetarian: false,
    available: true
  };

  menu: Menu = {
    id: '0',
    title: '',
    dish: this.dish,
    drink: '',
    dessert: ''
  };

  allergenTemp: string = '';
  imageTemp: string | ArrayBuffer | null = null;

  saving = false;
  saveError: string | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dishService: DishService
  ) {}

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
    if (allergen && !this.dish.allergens.includes(allergen)) {
      this.dish.allergens.push(allergen);
      this.allergenTemp = '';
    }
  }

  removeAllergen(allergen: string) {
    this.dish.allergens = this.dish.allergens.filter(a => a !== allergen);
  }

  onSave() {
    this.saveError = null;
    const validationErrors = this.validateDish();
    if (validationErrors.length > 0) {
      // du kannst hier auch mehrere Zeilen anzeigen
      this.saveError = 'Bitte alle Felder korrekt ausfüllen: ' + validationErrors.join(' ');
      return; 
    }

    this.saving = true;

    const dishToSave: MenuItem = {
      ...this.dish,
      id: this.dish.id || '0',
      name: (this.dish.name ?? '').trim(),
      description: (this.dish.description ?? '').trim(),
      category: (this.dish.category ?? '').trim(),
      price: Number(this.dish.price ?? 0)
    };

    console.log('Speichere Gericht:', dishToSave);

    this.dishService.saveDish(dishToSave).subscribe({
      next: savedDish => {
        this.saving = false;
        this.dish = savedDish;

        const hasMenuExtras =
          (this.menu.drink && this.menu.drink.trim() !== '') ||
          (this.menu.dessert && this.menu.dessert.trim() !== '');

        if (hasMenuExtras) {
          const completeMenu: Menu = {
            ...this.menu,
            dish: savedDish
          };
          this.router.navigate(['/menuplaner'], { state: { menu: completeMenu } });
        } else {
          this.router.navigate(['/menuplaner'], { state: { dish: savedDish } });
        }
      },
      error: err => {
        console.error('Fehler beim Speichern des Gerichts:', err);
        this.saving = false;
        this.saveError = 'Das Gericht konnte nicht gespeichert werden.';
      }
    });
  }
}
