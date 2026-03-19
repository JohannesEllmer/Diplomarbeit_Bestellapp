import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CartPageComponent } from './cart-page';
import { CartService } from '../services/cart/cart-service';
import { UserProfileService } from '../services/user-profile';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartItemComponent } from '../cart-item/cart-item';
import { SiteFooterComponent } from '../site-footer/footer';

describe('CartPageComponent', () => {
  let component: CartPageComponent;
  let fixture: ComponentFixture<CartPageComponent>;
  let mockCartService: any;
  let mockUserProfile: any;
  let mockRouter: any;

  const getProfileResponse = {
    user: { id: 'user1' },
    balance: 100,
    orderingEnabled: true
  };

  const initialCartItems = [
    { menuItem: { id: '1', price: 5 }, quantity: 2, note: '' },
    { menuItem: { id: '2', price: 3.50 }, quantity: 1, note: '' },
  ];

  beforeEach(async () => {
    mockCartService = {
      getCartItems: jasmine.createSpy('getCartItems').and.returnValue([...initialCartItems]),
      validateCartAgainstActiveMenu: jasmine.createSpy('validateCartAgainstActiveMenu').and.returnValue(of({ clearedBecauseMenuChanged: false, removedItemsCount: 0 })),
      increaseQuantity: jasmine.createSpy('increaseQuantity').and.callFake((items, index) => {
        items[index].quantity += 1;
        return items;
      }),
      decreaseQuantity: jasmine.createSpy('decreaseQuantity').and.callFake((items, index) => {
        items[index].quantity = Math.max(1, items[index].quantity - 1);
        return items;
      }),
      updateNote: jasmine.createSpy('updateNote').and.callFake((items, idx, note) => {
        items[idx].note = note;
        return items;
      }),
      removeItem: jasmine.createSpy('removeItem').and.callFake((items, index) => {
        items.splice(index, 1);
        return items;
      }),
      isValidTimeFormat: jasmine.createSpy('isValidTimeFormat').and.callFake((time: string) => /^\d{2}:\d{2}$/.test(time)),
      submitOrder: jasmine.createSpy('submitOrder').and.returnValue(of({})),
      clearCart: jasmine.createSpy('clearCart')
    };

    mockUserProfile = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of(getProfileResponse))
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, CartPageComponent, CartItemComponent, SiteFooterComponent],
      providers: [
        { provide: CartService, useValue: mockCartService },
        { provide: UserProfileService, useValue: mockUserProfile },
        { provide: Router, useValue: mockRouter }
      ],
      declarations: []
    }).compileComponents();

    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load cart items and profile on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(mockCartService.getCartItems).toHaveBeenCalled();
    expect(mockCartService.validateCartAgainstActiveMenu).toHaveBeenCalled();
    expect(component.cartItems.length).toBe(2);
    expect(mockUserProfile.getProfile).toHaveBeenCalled();
    expect(component.userId).toBe('user1');
    expect(component.balance).toBe(100);
    expect(component.orderingEnabled).toBeTrue();
    flush();
  }));

  it('should increase and decrease quantity', () => {
    fixture.detectChanges();
    component.increaseQuantity(0);
    expect(component.cartItems[0].quantity).toBe(3);
    component.decreaseQuantity(0);
    expect(component.cartItems[0].quantity).toBe(2);
  });

  it('should update note', () => {
    fixture.detectChanges();
    component.updateNote(1, 'some note');
    expect(component.cartItems[1].note).toBe('some note');
  });

  it('should remove item', () => {
    fixture.detectChanges();
    component.removeItem(0);
    expect(component.cartItems.length).toBe(1);
  });

  it('getTotal should calculate correct sum', () => {
    component.cartItems = [
      { menuItem: { price: '1,99' }, quantity: 3 },
      { menuItem: { price: 2 }, quantity: 2 }
    ] as any;
    expect(component.getTotal()).toBeCloseTo(3 * 1.99 + 2 * 2);
  });

  describe('onOrder', () => {
    let validateResultSubject: Subject<any>;
    beforeEach(() => {
      component.cartItems = [
        { menuItem: { id: '1', price: 2 }, quantity: 2, note: '' }
      ] as any;
      component.selectedTime = '10:10';
      component.userId = 'user1';
      component.balance = 100;
      component.orderingEnabled = true;
      component.submitting = false;
      spyOn<any>(component, 'isWithinBusinessHours').and.returnValue(true);
      validateResultSubject = new Subject();
      mockCartService.validateCartAgainstActiveMenu.and.returnValue(validateResultSubject.asObservable());
      mockCartService.isValidTimeFormat.and.returnValue(true);
      mockCartService.submitOrder.and.returnValue(of({}));
    });

    it('should set error if cart is empty', fakeAsync(() => {
      component.cartItems = [];
      mockCartService.getCartItems.and.returnValue([]);
      component.onOrder();
      validateResultSubject.next({ clearedBecauseMenuChanged: false, removedItemsCount: 0 });
      validateResultSubject.complete();
      tick();
      expect(component.timeError).toContain('leer');
      flush();
    }));

    it('should set error if not enough balance', fakeAsync(() => {
      component.balance = 1;
      component.onOrder();
      validateResultSubject.next({ clearedBecauseMenuChanged: false, removedItemsCount: 0 });
      validateResultSubject.complete();
      tick();
      expect(component.timeError).toContain('Nicht genug Guthaben');
      flush();
    }));

    it('should submit order and clear cart', fakeAsync(() => {
      component.onOrder();
      validateResultSubject.next({ clearedBecauseMenuChanged: false, removedItemsCount: 0 });
      validateResultSubject.complete();
      tick();

      expect(mockCartService.submitOrder).toHaveBeenCalled();
      expect(mockCartService.clearCart).toHaveBeenCalled();
      expect(component.cartItems.length).toBe(0);
      expect(component.selectedTime).toBe('');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/my-orders']);
      flush();
    }));
  });

  it('should navigate back', () => {
    component.navigateBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });
});
