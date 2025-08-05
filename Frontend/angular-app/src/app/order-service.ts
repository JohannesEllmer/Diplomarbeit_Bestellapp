import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { OrderItem } from '../models/menu-item.model';
import { environment } from './env';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private mockOrders: OrderItem[] = [
  {
    menuItem: {
      id: 1,
      title: 'Kürbiscremesuppe',
      description: '',
      price: 4.90,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 101,
      name: 'Anna Müller',
      email: 'anna@example.com',
      class: '3A',
      orderCount: 5,
      balance: 10.00,
      blocked: false,
      profileImageUrl: 'assets/anna.jpg'
    },
    note: 'Ohne Ingwer',
    quantity: 2,
    delivered: false,
    deliveryTime: '12:30'
  },
  {
    menuItem: {
      id: 2,
      title: 'Wiener Schnitzel',
      description: '',
      price: 12.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 102,
      name: 'Max Mustermann',
      email: 'max@example.com',
      class: '4B',
      orderCount: 3,
      balance: 5.00,
      blocked: false,
      profileImageUrl: 'assets/max.jpg'
    },
    note: '',
    quantity: 1,
    delivered: true,
    deliveryTime: '13:00'
  },
  {
    menuItem: {
      id: 3,
      title: 'Spaghetti Bolognese',
      description: '',
      price: 8.90,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: false,
      allergens: ['Gluten'],
      imageUrl: ''
    },
    user: {
      id: 103,
      name: 'Lisa Schmidt',
      email: 'lisa@example.com',
      class: '5C',
      orderCount: 7,
      balance: 8.50,
      blocked: false,
      profileImageUrl: 'assets/lisa.jpg'
    },
    note: 'Extra Käse',
    quantity: 1,
    delivered: false,
    deliveryTime: '12:45'
  },
  {
    menuItem: {
      id: 4,
      title: 'Gemüsepfanne',
      description: '',
      price: 7.50,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: true,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 104,
      name: 'Tom Becker',
      email: 'tom@example.com',
      class: '2C',
      orderCount: 2,
      balance: 12.00,
      blocked: false,
      profileImageUrl: 'assets/tom.jpg'
    },
    note: '',
    quantity: 1,
    delivered: false,
    deliveryTime: '12:15'
  },
  {
    menuItem: {
      id: 5,
      title: 'Apfelstrudel',
      description: '',
      price: 3.90,
      category: 'Desserts',
      available: true,
      vegetarian: true,
      allergens: ['Gluten'],
      imageUrl: ''
    },
    user: {
      id: 105,
      name: 'Julia König',
      email: 'julia@example.com',
      class: '1A',
      orderCount: 1,
      balance: 6.00,
      blocked: false,
      profileImageUrl: 'assets/julia.jpg'
    },
    note: '',
    quantity: 2,
    delivered: true,
    deliveryTime: '13:15'
  },
  {
    menuItem: {
      id: 6,
      title: 'Grüner Salat',
      description: '',
      price: 4.50,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 106,
      name: 'Felix Bauer',
      email: 'felix@example.com',
      class: '3B',
      orderCount: 4,
      balance: 9.00,
      blocked: false,
      profileImageUrl: 'assets/felix.jpg'
    },
    note: 'Ohne Dressing',
    quantity: 1,
    delivered: false,
    deliveryTime: '12:00'
  },
  {
    menuItem: {
      id: 7,
      title: 'Pizza Margherita',
      description: '',
      price: 9.90,
      category: 'Hauptgerichte',
      available: true,
      vegetarian: true,
      allergens: ['Gluten', 'Milch'],
      imageUrl: ''
    },
    user: {
      id: 107,
      name: 'Nina Schwarz',
      email: 'nina@example.com',
      class: '4A',
      orderCount: 6,
      balance: 11.00,
      blocked: false,
      profileImageUrl: 'assets/nina.jpg'
    },
    note: '',
    quantity: 1,
    delivered: false,
    deliveryTime: '12:30'
  },
  {
    menuItem: {
      id: 8,
      title: 'Mineralwasser',
      description: '',
      price: 1.50,
      category: 'Getränke',
      available: true,
      vegetarian: true,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 108,
      name: 'Paul Weber',
      email: 'paul@example.com',
      class: '2B',
      orderCount: 2,
      balance: 3.00,
      blocked: false,
      profileImageUrl: 'assets/paul.jpg'
    },
    note: '',
    quantity: 1,
    delivered: true,
    deliveryTime: '13:00'
  },
  {
    menuItem: {
      id: 9,
      title: 'Tomatensuppe',
      description: '',
      price: 4.20,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: [],
      imageUrl: ''
    },
    user: {
      id: 109,
      name: 'Sophie Lang',
      email: 'sophie@example.com',
      class: '5A',
      orderCount: 8,
      balance: 7.50,
      blocked: false,
      profileImageUrl: 'assets/sophie.jpg'
    },
    note: 'Mit Croutons',
    quantity: 1,
    delivered: false,
    deliveryTime: '12:45'
  },
  {
    menuItem: {
      id: 10,
      title: 'Schokoladenpudding',
      description: '',
      price: 2.90,
      category: 'Desserts',
      available: true,
      vegetarian: true,
      allergens: ['Milch'],
      imageUrl: ''
    },
    user: {
      id: 110,
      name: 'Leon Hoffmann',
      email: 'leon@example.com',
      class: '1B',
      orderCount: 1,
      balance: 5.00,
      blocked: false,
      profileImageUrl: 'assets/leon.jpg'
    },
    note: '',
    quantity: 1,
    delivered: true,
    deliveryTime: '13:30'
  }
];


  constructor(private http: HttpClient) {}

  getOrders(): Observable<OrderItem[]> {
    return environment.useMockData
      ? of(this.mockOrders)
      : this.http.get<OrderItem[]>('/api/orders');
  }

  toggleDelivered(orderId: number, delivered: boolean): Observable<OrderItem> {
    if (environment.useMockData) {
      const order = this.mockOrders.find(o => o.menuItem.id === orderId);
      if (order) order.delivered = delivered;
      return of(order!);
    }
    return this.http.patch<OrderItem>(`/api/orders/${orderId}`, { delivered });
  }

  deleteOrder(orderId: number): Observable<void> {
    if (environment.useMockData) {
      this.mockOrders = this.mockOrders.filter(o => o.menuItem.id !== orderId);
      return of();
    }
    return this.http.delete<void>(`/api/orders/${orderId}`);
  }

  createOrder(order: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      this.mockOrders.push(order);
      return of(order);
    }
    return this.http.post<OrderItem>('/api/orders', order);
  }

  updateOrder(order: OrderItem): Observable<OrderItem> {
    if (environment.useMockData) {
      const index = this.mockOrders.findIndex(o => o.menuItem.id === order.menuItem.id);
      if (index !== -1) this.mockOrders[index] = order;
      return of(order);
    }
    return this.http.put<OrderItem>(`/api/orders/${order.menuItem.id}`, order);
  }
}
