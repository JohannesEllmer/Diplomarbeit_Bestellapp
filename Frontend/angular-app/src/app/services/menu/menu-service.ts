import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuItem, OrderItem } from '../../../models/menu-item.model';
import { Observable, of } from 'rxjs';
import { environment } from '../../env';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly apiUrl = 'https://your-backend-api.com/menu'; // Backend-URL für Menü
  private readonly storageKey = 'cartItems';

  private readonly mockMenuItems: MenuItem[] = [
    {
      id: 1,
      name: 'Kürbiscremesuppe',
      description: 'Cremige Suppe mit Kürbis und Ingwer',
      price: 4.90,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: ['G', 'L'],
     
    },
    {
      id: 2,
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      
    },
     {
      id: 3,
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      
    },
     {
      id: 4,
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
     
    },
     {
      id: 5,
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
      
    },
     {
      id: 6,
      name: 'Wiener Schnitzel',
      description: 'Kalbfleischschnitzel mit Petersilienkartoffeln',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['G', 'E', 'M'],
    
    },
    {
      id: 5,
      name: 'Cola',
      description: 'Erfrischungsgetränk',
      price: 3.50,
      category: 'Getränke',
      available: true,
      vegetarian: true,
      allergens: [],
     
    }
  ];

  constructor(private http: HttpClient) {}

  /** Holt Menü vom Backend oder aus Mockdaten */
  getMenuItems(): Observable<MenuItem[]> {
    if (environment.useMockData) {
      return of(this.mockMenuItems);
    }
    return this.http.get<MenuItem[]>(this.apiUrl);
  }

  /** Speichert aktuelle Auswahl lokal */
  saveOrderItems(orderItems: OrderItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(orderItems));
  }

  /** Holt gespeicherte Auswahl */
  getOrderItems(): OrderItem[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  /** Löscht gespeicherte Auswahl */
  clearOrderItems(): void {
    localStorage.removeItem(this.storageKey);
  }
}
