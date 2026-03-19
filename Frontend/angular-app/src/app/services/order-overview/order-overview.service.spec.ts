import { TestBed } from '@angular/core/testing';
import { OrderService } from './order-overview.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../AuthService';
import { of, throwError } from 'rxjs';

// Mock data structure based on Order from menu-item.model
const mockOrders = [
  {
    id: 'order1',
    status: 'open',
    user: { id: 'user123' },
    items: [],
  },
  {
    id: 'order2',
    status: 'closed',
    user: { id: 'user123' },
    items: [],
  },
  {
    id: 'order3',
    status: 'open',
    user: { id: 'user456' },
    items: [],
  },
];

describe('OrderService', () => {
  let service: OrderService;
  let http: { get: jasmine.Spy };
  let auth: { getCurrentUserId: jasmine.Spy };

  beforeEach(() => {
    http = jasmine.createSpyObj('HttpClient', ['get']);
    auth = jasmine.createSpyObj('AuthService', ['getCurrentUserId']);

    TestBed.configureTestingModule({
      providers: [
        OrderService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: auth },
      ]
    });

    service = TestBed.inject(OrderService);
  });

  afterEach(() => {
    // No global mocks to restore
  });

  it('should filter orders by current user and attach QR to open orders', (done) => {
    auth.getCurrentUserId.and.returnValue('user123');
    http.get.and.returnValue(of(mockOrders));

    service.getMyOrders().subscribe(filteredWithQr => {
      expect(filteredWithQr.length).toBe(2); // Only orders of user123

      const openOrder = filteredWithQr.find(o => o.status === 'open');
      const closedOrder = filteredWithQr.find(o => o.status === 'closed');

      expect(openOrder).toBeDefined();
      if (openOrder) {
        expect(openOrder.qrCodeUrl).toContain('Order-order1');
      }
      expect(closedOrder).toBeDefined();
      if (closedOrder) {
        expect(closedOrder.qrCodeUrl).toBeUndefined(); // No QR for closed orders
      }
      done();
    });
  });

  it('addQrForOpenOrders should only add QR to open orders', () => {
    const orders = [
      { id: '1', status: 'open' },
      { id: '2', status: 'closed' },
    ] as any[];

    const withQr = service.addQrForOpenOrders(orders);

    expect(withQr[0].qrCodeUrl).toContain('Order-1');
    expect(withQr[1].qrCodeUrl).toBeUndefined();
  });

  it('generateQrCode should return correct URL', () => {
    const url = service.generateQrCode('myOrderId');
    expect(url).toBe(
      'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-myOrderId'
    );
  });

  it('should handle http errors in getMyOrders', (done) => {
    auth.getCurrentUserId.and.returnValue('user123');
    http.get.and.returnValue(throwError(() => new Error('network error')));
    spyOn(console, 'error').and.callFake(() => {});

    service.getMyOrders().subscribe({
      next: () => {
        // Should not be called
        fail('Should not emit next');
      },
      error: (err) => {
        expect(err).toEqual(jasmine.any(Error));
        expect(console.error).toHaveBeenCalled();
        done();
      },
    });
  });
});
