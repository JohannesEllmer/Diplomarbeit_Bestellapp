import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Menu } from '../../../models/menu.model';
import { MenuItem, OrderItem } from '../../../models/menu-item.model';
import { environment } from '../../env';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  // Basis-URL deines Backends
  private readonly apiUrl = 'https://your-backend-api.com/menu';

  // Lokaler Storage (wie bisher)
  private readonly storageKey = 'cartItems';

  // -----------------------
  // Mock-Daten (bereinigt)
  // -----------------------
  private readonly mockMenuItems: MenuItem[] = [
    {
      id: '1',
      name: 'Kürbiscremesuppe',
      description: 'Cremige Suppe mit Kürbis und Ingwer',
      price: 4.9,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: ['G', 'L']
    },
    {
      id: '2',
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.5,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['A', 'C', 'G']
    },
    {
      id: '3',
      name: 'Gemüselasagne',
      description: 'Mit Spinat und Ricotta',
      price: 8.5,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: true,
      allergens: ['A', 'C', 'G']
    },
    {
      id: '4',
      name: 'Apfelstrudel',
      description: 'Mit Vanillesoße',
      price: 3.0,
      category: 'Süßes',
      available: true,
      vegetarian: true,
      allergens: ['A', 'C', 'G']
    },
    {
      id: '5',
      name: 'Cola 0,5l',
      description: 'Erfrischungsgetränk',
      price: 3.5,
      category: 'Getränke',
      available: true,
      vegetarian: true,
      allergens: []
    },
    {
      id: '6',
      name: 'Mineralwasser 0,5l',
      description: 'Prickelnd',
      price: 1.8,
      category: 'Getränke',
      available: true,
      vegetarian: true,
      allergens: []
    }
  ];

  private readonly mockMenus: Menu[] = [
    {
      id: 'm1',
      title: 'Mittagsmenü Klassik',
      dish: {
        id: '10',
        name: 'Schnitzel mit Pommes',
        description: 'Knusprig paniert, mit Zitrone',
        price: 8.9,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: false,
        allergens: ['A', 'C', 'G']
      },
      drink: 'Apfelsaft gespritzt',
      dessert: 'Schokopudding'
    },
    {
      id: 'm2',
      title: 'Veggie Menü',
      dish: {
        id: '11',
        name: 'Gemüse-Curry',
        description: 'Mildes Curry mit Basmatireis',
        price: 8.2,
        category: 'Hauptgerichte',
        available: true,
        vegetarian: true,
        allergens: []
      },
      drink: 'Mineralwasser',
      dessert: 'Obstsalat'
    }
  ];

  constructor(private http: HttpClient) {}

  // -------------------------------------------------
  // Einzelgerichte (Items)
  // -------------------------------------------------
  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockData) {
      return of(this.mockMenuItems);
    }
    return this.http
      .get<MenuItem[]>(`${this.apiUrl}/items`)
      .pipe(
        // Fallback auf Mock, falls Backend nicht erreichbar ist
        catchError(() => of(this.mockMenuItems))
      );
  }

  // -------------------------------------------------
  // Vorgefertigte Menüs (Combos)
  // -------------------------------------------------
  getMenus(): Observable<Menu[]> {
    if (environment.useMockData) {
      return of(this.mockMenus);
    }
    return this.http
      .get<Menu[]>(`${this.apiUrl}/menus`)
      .pipe(
        // Fallback auf Mock
        catchError(() => of(this.mockMenus))
      );
  }

  // -------------------------------------------------
  // Lokaler Warenkorb (beibehalten, auch wenn i.d.R. CartService zuständig ist)
  // -------------------------------------------------
  saveOrderItems(orderItems: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(orderItems));
  }

  getOrderItems(): OrderItem[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  clearOrderItems(): void {
    localStorage.removeItem(this.storageKey);
  }
}
