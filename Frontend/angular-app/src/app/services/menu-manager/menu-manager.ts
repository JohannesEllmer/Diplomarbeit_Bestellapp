import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { MealPlan } from '../../../models/meal-plan.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  /**
   * Backend-URL für alle Menü-Operationen.
   * → An dein Backend anpassen (z. B. '/api/meal-plans').
   */
  private readonly apiUrl = '/api/menus';

  /**
   * Timeout in Millisekunden für Backend-Calls.
   * Wenn der Server länger braucht, greifen wir auf Mockdaten zurück.
   */
  private readonly requestTimeoutMs = 1500;

  /**
   * Mockdaten als Fallback für schnelle Reaktion.
   * Wird verwendet, wenn Backend nicht erreichbar / zu langsam ist.
   */
  private mockMenus: MealPlan[] = [
    {
      id: '0',
      title: 'Tagesmenü',
      dishes: [
        {
          id: '1',
          name: 'Kürbiscremesuppe',
          description: 'Cremige Suppe aus Hokkaido-Kürbis mit Kernöl',
          price: 6.5,
          allergenes: ['Gluten', 'Milch']
        },
        {
          id: '2',
          name: 'Wiener Schnitzel',
          description: 'Klassisches Kalbsschnitzel mit Kartoffelsalat',
          price: 18.9,
          allergenes: ['Gluten', 'Ei', 'Milch']
        },
        {
          id: '3',
          name: 'Apfelstrudel',
          description: 'Hausgemachter Strudel mit Vanillesoße',
          price: 6.9,
          allergenes: ['Gluten', 'Ei', 'Milch', 'Nüsse']
        }
      ]
    },
    {
      id: '1',
      title: 'Vegetarisches Menü',
      dishes: [
        {
          id: '1',
          name: 'Gemüsesuppe',
          description: 'Klare Suppe mit Frühlingsgemüse',
          price: 5.9,
          allergenes: ['Sellerie']
        },
        {
          id: '2',
          name: 'Spinatknödel',
          description: 'Hausgemachte Knödel mit Salbeibutter',
          price: 14.9,
          allergenes: ['Gluten', 'Ei', 'Milch']
        }
      ]
    },
    {
      id: '2',
      title: 'Bayerische Spezialitäten',
      dishes: [
        {
          id: '1',
          name: 'Leberkäse',
          description: 'Mit Spiegelei und Kartoffelsalat',
          price: 11.9
        },
        {
          id: '2',
          name: 'Schweinebraten',
          description: 'Mit Knödel und Sauerkraut',
          price: 16.9
        },
        {
          id: '3',
          name: 'Obatzda',
          description: 'Mit Brezel und Radieschen',
          price: 8.9
        }
      ]
    }
  ];

  constructor(private http: HttpClient) {}

  // ---------------------------------------------------------------------------
  //  Manager-Funktionalität
  // ---------------------------------------------------------------------------

  /**
   * Alle Menüs laden.
   * Wird vom MenuManager genutzt.
   * Bei Fehler oder Timeout → Mockdaten.
   */
  getMenus(): Observable<MealPlan[]> {
    return this.http.get<MealPlan[]>(this.apiUrl).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn('getMenus: Timeout – nutze Mockdaten');
          return of(this.mockMenus);
        }
      }),
      catchError(error => {
        console.error('getMenus: Fehler – nutze Mockdaten:', error);
        return of(this.mockMenus);
      })
    );
  }

  /**
   * Ein Menü nach ID laden (z. B. wenn der Planner direkt per ID geöffnet wird).
   * Bei Fehler / Timeout → Versuche Mock zu nehmen, sonst null.
   */
  getMenuById(id: string): Observable<MealPlan | null> {
    if (!id) {
      return of(null);
    }

    return this.http.get<MealPlan>(`${this.apiUrl}/${id}`).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn(`getMenuById(${id}): Timeout – nutze Mockdaten`);
          const fallback = this.mockMenus.find(m => m.id === id) ?? null;
          return of(fallback);
        }
      }),
      catchError(error => {
        console.error(`getMenuById(${id}): Fehler – nutze Mockdaten:`, error);
        const fallback = this.mockMenus.find(m => m.id === id) ?? null;
        return of(fallback);
      })
    );
  }

  /**
   * Menü im Backend löschen.
   * Wird vom MenuManager genutzt.
   * Bei Fehler / Timeout: wir löschen es zumindest aus den Mockdaten.
   */
  deleteMenu(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      timeout({
        each: this.requestTimeoutMs,
        with: () => {
          console.warn(`deleteMenu(${id}): Timeout – lösche nur in Mock`);
          this.mockMenus = this.mockMenus.filter(m => m.id !== id);
          return of(void 0);
        }
      }),
      catchError(error => {
        console.error(`deleteMenu(${id}): Fehler – lösche nur in Mock:`, error);
        this.mockMenus = this.mockMenus.filter(m => m.id !== id);
        return of(void 0);
      })
    );
  }

  // ---------------------------------------------------------------------------
  //  Planner-Funktionalität (Speichern / Erstellen)
  // ---------------------------------------------------------------------------

  /**
   * Menü speichern (neu oder aktualisieren).
   * Wird vom MenuPlanner genutzt.
   *
   * - Wenn menu.id leer / 'new' → POST (neues Menü)
   * - sonst → PUT (bestehendes Menü updaten)
   *
   * Bei Fehler / Timeout:
   *   - new: wir generieren eine pseudo-ID, fügen in MockListe ein
   *   - update: wir aktualisieren ggf. MockListe und geben das Menü zurück
   */
  saveMenu(menu: MealPlan): Observable<MealPlan> {
    const isNew = !menu.id || menu.id === 'new';

    // Normiertes Menü-Objekt
    const payload: MealPlan = {
      ...menu,
      id: isNew ? 'new' : menu.id
    };

    if (isNew) {
      // Neues Menü → POST
      return this.http.post<MealPlan>(this.apiUrl, payload).pipe(
        timeout({
          each: this.requestTimeoutMs,
          with: () => {
            console.warn('saveMenu(new): Timeout – Mock-Fallback (POST)');
            const fallback: MealPlan = {
              ...payload,
              id: String(Date.now())
            };
            this.mockMenus = [...this.mockMenus, fallback];
            return of(fallback);
          }
        }),
        catchError(error => {
          console.error('saveMenu(new): Fehler – Mock-Fallback (POST):', error);
          const fallback: MealPlan = {
            ...payload,
            id: String(Date.now())
          };
          this.mockMenus = [...this.mockMenus, fallback];
          return of(fallback);
        })
      );
    } else {
      // Bestehendes Menü → PUT
      return this.http.put<MealPlan>(`${this.apiUrl}/${payload.id}`, payload).pipe(
        timeout({
          each: this.requestTimeoutMs,
          with: () => {
            console.warn(`saveMenu(${payload.id}): Timeout – Mock-Fallback (PUT)`);
            this.updateMockMenus(payload);
            return of(payload);
          }
        }),
        catchError(error => {
          console.error(`saveMenu(${payload.id}): Fehler – Mock-Fallback (PUT):`, error);
          this.updateMockMenus(payload);
          return of(payload);
        })
      );
    }
  }

  /**
   * Hilfsfunktion: Menü in den Mockdaten einfügen oder aktualisieren.
   */
  private updateMockMenus(menu: MealPlan): void {
    const index = this.mockMenus.findIndex(m => m.id === menu.id);
    if (index !== -1) {
      const copy = [...this.mockMenus];
      copy[index] = menu;
      this.mockMenus = copy;
    } else {
      this.mockMenus = [...this.mockMenus, menu];
    }
  }
}
