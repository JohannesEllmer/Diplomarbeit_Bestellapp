import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



/* @Injectable({
  providedIn: 'root'
}) */
/* export class UserService {
  private apiUrl = 'https://your-api-url.com/api/users'; 

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  updateBalance(userId: number, amount: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/balance`, { amount });
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}`);
  }

  blockUser(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${userId}/block`, {});
  }
} */
