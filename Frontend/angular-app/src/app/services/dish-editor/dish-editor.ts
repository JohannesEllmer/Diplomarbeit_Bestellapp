import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MenuItem } from '../../../models/menu-item.model';

@Injectable({
  providedIn: 'root'
})
export class DishService {
  // TODO: an deine echte Backend-URL anpassen
  private readonly apiUrl = '/api/dishes';

  // Mockdaten als Fallback
  private readonly mockDishes: MenuItem[] = [
    {
      id: '1',
      name: 'Spaghetti Bolognese',
      description: 'Klassische Pasta mit Rindfleischsauce',
      price: 11.9,
      category: 'Hauptgericht',
      allergens: ['Gluten'],
      vegetarian: false,
      available: true
    },
    {
      id: '2',
      name: 'Margherita',
      description: 'Pizza mit Tomaten, Mozzarella und Basilikum',
      price: 9.5,
      category: 'Pizza',
      allergens: ['Gluten', 'Milch'],
      vegetarian: true,
      available: true
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Alle Gerichte laden (z. B. für eine Liste).
   * Bei Fehler: Mockdaten zurückgeben.
   */
  getDishes(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Fehler beim Laden der Gerichte, verwende Mockdaten:', error);
        return of(this.mockDishes);
      })
    );
  }

  /**
   * Einzelnes Gericht laden.
   * Bei Fehler: null zurückgeben.
   */
  getDishById(id: string): Observable<MenuItem | null> {
    if (!id) {
      return of(null);
    }

    return this.http.get<MenuItem>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Fehler beim Laden des Gerichts (${id}):`, error);
        // Fallback: versuchen, aus den Mockdaten zu finden
        const fallback = this.mockDishes.find(d => d.id === id) ?? null;
        return of(fallback);
      })
    );
  }

  /**
   * Gericht speichern (neu oder aktualisieren).
   * - wenn id leer / '0' / 'new' => POST
   * - sonst => PUT
   * Bei Fehler: Mock-Fallback mit pseudo-ID.
   */
  saveDish(dish: MenuItem): Observable<MenuItem> {
    const isNew = !dish.id || dish.id === '0' || dish.id === 'new';

    const payload: MenuItem = {
      ...dish,
      available: dish.available ?? true
    };

    if (isNew) {
      return this.http.post<MenuItem>(this.apiUrl, payload).pipe(
        catchError(error => {
          console.error('Fehler beim Anlegen des Gerichts, Mock-Fallback:', error);
          const fallback: MenuItem = {
            ...payload,
            id: String(Date.now())
          };
          return of(fallback);
        })
      );
    } else {
      return this.http.put<MenuItem>(`${this.apiUrl}/${payload.id}`, payload).pipe(
        catchError(error => {
          console.error('Fehler beim Aktualisieren des Gerichts, Mock-Fallback:', error);
          // Wir tun so, als wäre das Update erfolgreich
          return of(payload);
        })
      );
    }
  }

  /**
   * Gericht löschen.
   * Bei Fehler: Fehler loggen, aber kein Crash.
   */
  deleteDish(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Fehler beim Löschen des Gerichts:', error);
        return of(void 0);
      })
    );
  }
}
