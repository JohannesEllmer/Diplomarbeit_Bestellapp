import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrderOverviewComponent } from './order-overview';
import { MyOrderService } from '../services/order-overview/my-order.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { of, throwError } from 'rxjs';

describe('OrderOverviewComponent', () => {
  let component: OrderOverviewComponent;
  let fixture: ComponentFixture<OrderOverviewComponent>;
  let mockOrderService: any;
  let mockRouter: any;

  const mockOrders = [
    {
      id: '1',
      status: 'open',
      items: [
        { quantity: 2, menuItem: { name: 'Pizza', price: 5 } },
        { quantity: 1, menuItem: { name: 'Cola', price: 2 } }
      ]
    },
    {
      id: '2',
      status: 'closed',
      items: [
        { quantity: 1, menuItem: { name: 'Fanta', price: 2 } }
      ]
    }
  ];

  beforeEach(async () => {
    mockOrderService = {
      getMyOrders: jasmine.createSpy().and.returnValue(of(mockOrders)),
      addQrForOpenOrders: jasmine.createSpy().and.callFake((orders: any[]) => {
        return orders.map(o => ({
          ...o,
          qrCodeUrl: o.status === 'open' ? 'test-qr-url' : undefined,
        }));
      })
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OrderOverviewComponent
      ],
      providers: [
        { provide: MyOrderService, useValue: mockOrderService },
        { provide: Router, useValue: mockRouter },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderOverviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders on init', () => {
    fixture.detectChanges(); // triggers ngOnInit and thus loadMyOrders

    expect(mockOrderService.getMyOrders).toHaveBeenCalled();
    expect(mockOrderService.addQrForOpenOrders).toHaveBeenCalled();
    expect(component.orders.length).toBe(2);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('should filter open and closed orders correctly', () => {
    fixture.detectChanges();

    expect(component.openOrders.length).toBe(1);
    expect(component.closedOrders.length).toBe(1);
    expect(component.openOrders[0].status).toBe('open');
    expect(component.closedOrders[0].status).toBe('closed');
  });

  it('should calculate totalPrice if missing', () => {
    const ordersWithoutTotal = [
      {
        id: '3',
        status: 'open',
        items: [
          { quantity: 3, menuItem: { name: 'Wasser', price: 1 } }
        ]
      }
    ];
    mockOrderService.getMyOrders.and.returnValue(of(ordersWithoutTotal));
    mockOrderService.addQrForOpenOrders.and.callFake((orders: any[]) => orders);
    fixture = TestBed.createComponent(OrderOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.orders[0].totalPrice).toBe(3);
  });

  it('should set error if loading orders fails', () => {
    mockOrderService.getMyOrders.and.returnValue(throwError(() => new Error('network error')));
    fixture = TestBed.createComponent(OrderOverviewComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.error).toBe('Bestellungen konnten nicht geladen werden.');
    expect(component.loading).toBeFalse();
  });

  it('should toggle order details', () => {
    component.orders = [{
      id: '1', status: 'open',
      user: { id: 'dummy', name: 'Test User' } as any,
      items: [],
      totalPrice: 0,
      createdAt: undefined
    }];
    const order = component.orders[0];

    expect((order as any).showDetails).toBeUndefined();

    component.toggleDetails(order);
    expect((order as any).showDetails).toBeTrue();

    component.toggleDetails(order);
    expect((order as any).showDetails).toBeFalse();
  });

  it('should navigate back', () => {
    component.navigateBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should return order title correctly', () => {
    const emptyOrder = { items: [] };
    const singleOrder = { items: [{ quantity: 1, menuItem: { name: 'Cola' } }] };
    const twoOrder = { items: [
        { quantity: 1, menuItem: { name: 'Fanta' } },
        { quantity: 2, menuItem: { name: 'Pizza' } }
      ]};
    const threeOrder = { items: [
        { quantity: 1, menuItem: { name: 'Apfelschorle' } },
        { quantity: 2, menuItem: { name: 'Pizza' } },
        { quantity: 3, menuItem: { name: 'Cola' } }
      ]};
    expect(component.getOrderTitle(emptyOrder as any)).toBe('Leere Bestellung');
    expect(component.getOrderTitle(singleOrder as any)).toBe('1× Cola');
    expect(component.getOrderTitle(twoOrder as any)).toBe('1× Fanta, 2× Pizza');
    expect(component.getOrderTitle(threeOrder as any)).toBe('1× Apfelschorle, 2× Pizza (+1 weitere)');
  });
});
