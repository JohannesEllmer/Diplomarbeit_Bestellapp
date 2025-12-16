import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Dish } from '../../../models/dish.model';
import { environment } from '../env';

@Injectable({ providedIn: 'root' })
export class DishService {
  private readonly apiBase = environment.apiBaseUrl ?? 'http://localhost:3000/api';
  private readonly endpoint = `${this.apiBase}/dishes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Dish[]> {
    return this.http.get<Dish[]>(this.endpoint);
  }
}
