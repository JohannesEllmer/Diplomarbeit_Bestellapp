import { MenuPlanComponent } from './menu-plan-component';
import { Router } from '@angular/router';
import { MenuService } from '../services/menu/menu-service';
import { CartService } from '../services/cart/cart-service';
import { MenuItem } from '../../models/menu-item.model';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('MenuPlanComponent', () => {
  let component: MenuPlanComponent;
  let fixture: ComponentFixture<MenuPlanComponent>;
  let menuServiceSpy: jasmine.SpyObj<MenuService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockMenuItems: MenuItem[] = [
    { id: 1, title: 'Salat', description: 'Frischer Salat', price: 5, category: 'Vorspeisen', available: true, vegetarian: true, allergens: ['Nüsse'] },
    { id: 2, title: 'Cola', description: 'Erfrischungsgetränk', price: 2, category: 'Getränke', available: true, vegetarian: true, allergens: [] }
  ];

  beforeEach(async () => {
    menuServiceSpy = jasmine.createSpyObj('MenuService', ['getMenuItems']);
    cartServiceSpy = jasmine.createSpyObj('CartService', ['getItemCount', 'getTotal', 'saveCartItems', 'getCartItems']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [MenuPlanComponent],
      providers: [
        { provide: MenuService, useValue: menuServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuPlanComponent);
    component = fixture.componentInstance;

    menuServiceSpy.getMenuItems.and.returnValue(of(mockMenuItems));
    cartServiceSpy.getCartItems.and.returnValue([]);
    fixture.detectChanges(); // ngOnInit ausführen
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load menu items on init', () => {
    expect(menuServiceSpy.getMenuItems).toHaveBeenCalled();
    expect(component.menuItems.length).toBe(2);
  });

  it('should filter out drinks when category is "Alle"', () => {
    component.activeCategory = 'Alle';
    const filtered = component.filteredItems;
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('Salat');
  });

  it('should filter vegetarian items when filter is "Vegetarisch"', () => {
    component.activeFilter = 'Vegetarisch';
    const filtered = component.filteredItems;
    expect(filtered.every(item => item.vegetarian)).toBeTrue();
  });

  it('should add new item to order (cart)', () => {
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    expect(cartServiceSpy.saveCartItems).toHaveBeenCalled();
  });

  it('should increase quantity if same item with same note/time is added again', () => {
    let cart: any[] = [];
    cartServiceSpy.getCartItems.and.returnValue(cart);

    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    cartServiceSpy.getCartItems.and.returnValue(cart);
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');

    expect(cart[0].quantity).toBe(2);
  });

  it('should remove item from order', () => {
    let cart: any[] = [{ menuItem: mockMenuItems[0], note: '', quantity: 1, deliveryTime: '12:00' }];
    cartServiceSpy.getCartItems.and.returnValue(cart);

    component.removeFromOrder(mockMenuItems[0], '', '12:00');
    expect(cartServiceSpy.saveCartItems).toHaveBeenCalledWith([]);
  });

  it('should update note of an order item', () => {
    let cart: any[] = [{ menuItem: mockMenuItems[0], note: 'alt', quantity: 1, deliveryTime: '12:00' }];
    cartServiceSpy.getCartItems.and.returnValue(cart);

    component.updateNote(mockMenuItems[0], 'alt', 'neu');
    expect(cart[0].note).toBe('neu');
  });

  it('should change quantity with delta', () => {
    let cart: any[] = [{ menuItem: mockMenuItems[0], note: '', quantity: 1, deliveryTime: '12:00' }];
    cartServiceSpy.getCartItems.and.returnValue(cart);

    component.changeQuantity(mockMenuItems[0], '', '12:00', 1);
    expect(cart[0].quantity).toBe(2);
    component.changeQuantity(mockMenuItems[0], '', '12:00', -5);
    expect(cart[0].quantity).toBe(1); // Mindestmenge 1
  });

  it('should return cart item count from cartService', () => {
    cartServiceSpy.getItemCount.and.returnValue(3);
    expect(component.cartItemCount).toBe(3);
  });

  it('should return total cost from cartService', () => {
    cartServiceSpy.getTotal.and.returnValue(12.5);
    expect(component.totalCost).toBe(12.5);
  });

  it('should navigate to cart and save items', () => {
    component.addToOrder(mockMenuItems[0], '', '12:00');
    component.navigateToCart();
    expect(cartServiceSpy.saveCartItems).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/warenkorb']);
  });
});
