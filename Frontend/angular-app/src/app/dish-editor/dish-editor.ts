import { Component, ChangeDetectorRef } from '@angular/core';
import { MenuItemComponent} from '../menu-item-component/menu-item-component';
import { MenuItem } from '../../models/menu-item.model';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'
import { Menu } from '../../models/menu.model';

@Component({
  selector: 'app-dish-editor',
  imports: [MenuItemComponent, FormsModule],
  templateUrl: './dish-editor.html',
  styleUrl: './dish-editor.css'
})
export class DishEditor {
  dish: MenuItem = {
    name: '',
    description: '',
    price: 0,
    category: '',
    allergens: [],
    vegetarian: false,
    id: 0,
    available: true
  }
  menu: Menu = {
    title: '',
    dish: this.dish,
    drink: '',
    dessert: ''
  }

  allergenTemp: string = '';
  imageTemp: string | ArrayBuffer | null = null;

  constructor(private cdr: ChangeDetectorRef, private router: Router) {}

  onImageSelected(event: Event){
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  addAllergen(){
    const allergen = this.allergenTemp?.trim();
    if(allergen && !this.dish.allergens.includes(allergen)){
      this.dish.allergens.push(allergen);
      this.allergenTemp = '';
    }
  }
  removeAllergen(allergen: string){
    this.dish.allergens = this.dish.allergens.filter(a => a !== allergen);
  }

  onSave(){
    console.log(this.dish)
    if(this.menu.drink != '' || this.menu.drink != ''){
      this.router.navigate(['/menuplaner'], { state: { menu: this.menu } })
    } else{
      this.router.navigate(['/menuplaner'], { state: { dish: this.dish } })
    }
  }
}
