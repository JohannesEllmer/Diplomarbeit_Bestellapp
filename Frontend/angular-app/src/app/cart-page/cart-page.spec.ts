import { CartPageComponent } from './cart-page';
import { CartService } from '../services/cart/cart-service';
import { Router } from '@angular/router';
import { OrderItem } from '../../models/menu-item.model';
import { User } from '../../models/user.model';
import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

describe('CartPageComponent', () => {
  let component: CartPageComponent;
  let cartService: jasmine.SpyObj<CartService>;
  let router: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 1,
    name: 'Max Mustermann',
    email: 'max@example.com',
    class: '10A',
    orderCount: 5,
    balance: 25.50,
    blocked: false,
    profileImageUrl: 'max.jpg',
    showDetails: false,
    editingBalance: false,
    newBalance: undefined
  };

  const mockItems: OrderItem[] = [
    {
      menuItem: {
        id: 1,
        title: 'Pizza',
        description: 'Leckere Pizza mit Tomatensauce',
        price: 10,
        category: 'Hauptgericht',
        available: true,
        vegetarian: false,
        allergens: ['Gluten', 'Milch'],
        imageUrl: 'pizza.jpg'
      },
      user: mockUser,
      quantity: 2,
      note: 'extra Käse'
    }
  ];

  beforeEach(() => {
    cartService = jasmine.createSpyObj('CartService', [
      'getCartItems',
      'increaseQuantity',
      'decreaseQuantity',
      'updateNote',
      'removeItem',
      'getTotal',
      'isValidTimeFormat',
      'submitOrder',
      'clearCart'
    ]);

    cartService.getCartItems.and.returnValue(mockItems);
    cartService.increaseQuantity.and.returnValue(mockItems);
    cartService.decreaseQuantity.and.returnValue(mockItems);
    cartService.updateNote.and.returnValue(mockItems);
    cartService.removeItem.and.returnValue([]);
    cartService.getTotal.and.returnValue(20);
    cartService.isValidTimeFormat.and.returnValue(true);
    cartService.submitOrder.and.returnValue(of({}));

    router = jasmine.createSpyObj('Router', ['navigate']);

    component = new CartPageComponent(router, cartService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load cart items on init', () => {
    component.ngOnInit();
    expect(cartService.getCartItems).toHaveBeenCalled();
    expect(component.cartItems).toEqual(mockItems);
  });

  it('should increase quantity', () => {
    component.cartItems = mockItems;
    component.increaseQuantity(0);
    expect(cartService.increaseQuantity).toHaveBeenCalledWith(mockItems, 0);
  });

  it('should decrease quantity', () => {
    component.cartItems = mockItems;
    component.decreaseQuantity(0);
    expect(cartService.decreaseQuantity).toHaveBeenCalledWith(mockItems, 0);
  });

  it('should update note', () => {
    component.cartItems = mockItems;
    component.updateNote(0, 'ohne Zwiebel');
    expect(cartService.updateNote).toHaveBeenCalledWith(mockItems, 0, 'ohne Zwiebel');
  });

  it('should remove item', () => {
    component.cartItems = mockItems;
    component.removeItem(0);
    expect(cartService.removeItem).toHaveBeenCalledWith(mockItems, 0);
  });

  it('should return allergens as string', () => {
    expect(component.getAllergens(['Gluten', 'Milch'])).toBe('Gluten, Milch');
    expect(component.getAllergens(undefined)).toBe('-');
  });

  it('should calculate total', () => {
    expect(component.getTotal()).toBe(20);
  });

  it('should show error for invalid time format', () => {
    cartService.isValidTimeFormat.and.returnValue(false);
    component.selectedTime = 'abc';
    component.onOrder();
    expect(component.timeError).toBe('Bitte gib eine gültige Uhrzeit im Format HH:mm ein.');
  });

  it('should submit order and clear cart on success', fakeAsync(() => {
    component.selectedTime = '12:00';
    spyOn(window, 'alert');
    component.onOrder();
    tick();
    expect(cartService.submitOrder).toHaveBeenCalled();
    expect(cartService.clearCart).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Bestellung erfolgreich übermittelt.');
  }));

  it('should navigate back', () => {
    component.navigateBack();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
