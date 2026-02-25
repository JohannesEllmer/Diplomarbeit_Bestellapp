import { OrderService } from './order-overview.service';
import { Order } from '../../../models/menu-item.model';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    // Using {} as any for dependencies because they're not used in tested methods
    service = new OrderService();
  });

  describe('generateQrCode', () => {
    it('should generate correct QR code URL for an order ID', () => {
      const orderId = '12345';
      const url = service.generateQrCode(orderId);
      expect(url).toBe('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-12345');
    });
  });

  describe('addQrForOpenOrders', () => {
    it('should add qrCodeUrl only for open orders', () => {
      const mockOrders: Order[] = [
        { id: '1', status: 'open', user: {} as any, items: [], totalPrice: 0, createdAt: new Date() },
        { id: '2', status: 'closed', user: {} as any, items: [], totalPrice: 0, createdAt: new Date() },
        { id: '3', status: 'open', user: {} as any, items: [], totalPrice: 0, createdAt: new Date() },
      ];
      const result = service.addQrForOpenOrders(mockOrders);

      expect(result[0].qrCodeUrl).toBe(service.generateQrCode('1'));
      expect(result[1].qrCodeUrl).toBeUndefined();
      expect(result[2].qrCodeUrl).toBe(service.generateQrCode('3'));
    });

    it('should not remove existing defined optional properties', () => {
      const mockOrders: Order[] = [
        {
          id: 'a',
          status: 'open',
          user: {} as any,
          items: [],
          totalPrice: 0,
          createdAt: new Date(),
          showDetails: true
        }
      ];
      const [result] = service.addQrForOpenOrders(mockOrders);
      expect(result.showDetails).toBe(true);
    });

    it('should return an empty array when given no orders', () => {
      const result = service.addQrForOpenOrders([]);
      expect(result).toEqual([]);
    });
  });
});
