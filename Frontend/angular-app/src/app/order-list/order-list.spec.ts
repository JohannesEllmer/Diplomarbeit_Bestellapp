import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderListComponent } from './order-list';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { OrderService } from '../services/order/order-service';
import { OrderItem } from '../../models/menu-item.model';

describe('OrderListComponent', () => {
  let component: OrderListComponent;
  let fixture: ComponentFixture<OrderListComponent>;
  let mockOrderService: jasmine.SpyObj<OrderService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockOrders: OrderItem[] = [
    {
      menuItem: {
        id: 1,
        title: 'Pizza',
        description: '',
        price: 10,
        category: 'Hauptgericht',
        available: true,
        vegetarian: false,
        allergens: [],
        imageUrl: ''
      },
      user: {
        id: 1,
        name: 'Max Mustermann',
        email: 'max@example.com',
        class: '10A',
        orderCount: 5,
        balance: 20,
        blocked: false
      },
      note: '',
      quantity: 2,
      delivered: false,
      deliveryTime: '12:00'
    },
    {
      menuItem: {
        id: 2,
        title: 'Burger',
        description: '',
        price: 8,
        category: 'Hauptgericht',
        available: true,
        vegetarian: false,
        allergens: [],
        imageUrl: ''
      },
      user: {
        id: 2,
        name: 'Lisa Müller',
        email: 'lisa@example.com',
        class: '10B',
        orderCount: 3,
        balance: 15,
        blocked: false
      },
      note: '',
      quantity: 1,
      delivered: true,
      deliveryTime: '13:00'
    }
  ];

  beforeEach(async () => {
    mockOrderService = jasmine.createSpyObj('OrderService', ['getOrders', 'toggleDelivered']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderListComponent);
    component = fixture.componentInstance;
    mockOrderService.getOrders.and.returnValue(of(mockOrders));
    fixture.detectChanges();
  });

  it('should load orders on init', () => {
    expect(component.orderItems.length).toBe(2);
    expect(component.paginatedItems.length).toBe(2);
  });

  it('should calculate total sum correctly', () => {
    expect(component.totalSum).toBe(10 * 2 + 8 * 1); // 20 + 8 = 28
  });

  it('should paginate correctly', () => {
    component.itemsPerPage = 1;
    component.updatePagination();
    expect(component.paginatedItems.length).toBe(1);
    expect(component.pages).toEqual([1, 2]);
  });

  it('should change page correctly', () => {
    component.itemsPerPage = 1;
    component.changePage(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedItems[0].menuItem.title).toBe('Burger');
  });

  it('should group by Gericht', () => {
    component.activeGroup = 'Nach Gericht';
    const grouped = component.groupedOrders;
    expect(Object.keys(grouped)).toContain('Pizza');
    expect(Object.keys(grouped)).toContain('Burger');
  });

  it('should group by Lieferzeit', () => {
    component.activeGroup = 'Nach Lieferzeit';
    const grouped = component.groupedOrders;
    expect(Object.keys(grouped)).toContain('12:00');
    expect(Object.keys(grouped)).toContain('13:00');
  });

it('should toggle delivered status', () => {
  const item = mockOrders[0];
  const updatedItem: OrderItem = {
  ...mockOrders[0],
  delivered: true
};
mockOrderService.toggleDelivered.and.returnValue(of(updatedItem));

  component.toggleDelivered(item);

  expect(item.delivered).toBeTrue();
  expect(mockOrderService.toggleDelivered).toHaveBeenCalledWith(item.menuItem.id, true);
});


  it('should navigate to user', () => {
    component.navigateToUser(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', 1]);
  });
});
