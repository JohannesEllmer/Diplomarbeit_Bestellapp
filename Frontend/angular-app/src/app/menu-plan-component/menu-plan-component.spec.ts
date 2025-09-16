import { MenuPlanComponent } from './menu-plan-component';
import { Router } from '@angular/router';
import { MenuService } from '../services/menu/menu-service';
import { CartService } from '../services/cart/cart-service';
import { MenuItem, OrderItem } from '../../models/menu-item.model';
import { User } from '../../models/user.model';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('MenuPlanComponent', () => {
  let component: MenuPlanComponent;
  let fixture: ComponentFixture<MenuPlanComponent>;
  let menuServiceSpy: jasmine.SpyObj<MenuService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockMenuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Salat',
      description: 'Frischer Salat',
      price: 5,
      category: 'Vorspeisen',
      available: true,
      vegetarian: true,
      allergens: ['Nüsse'],
      image: 'salat.jpg'
    },
    {
      id: 2,
      title: 'Cola',
      description: 'Erfrischungsgetränk',
      price: 2,
      category: 'Getränke',
      available: true,
      vegetarian: true,
      allergens: [],
      image: 'cola.jpg'
    }
  ];

  beforeEach(async () => {
    menuServiceSpy = jasmine.createSpyObj('MenuService', ['getMenuItems']);
    cartServiceSpy = jasmine.createSpyObj('CartService', ['getItemCount', 'getTotal', 'saveCartItems']);
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

  it('should add new item to order', () => {
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    expect(component.orderItems.length).toBe(1);
    expect(component.orderItems[0].quantity).toBe(1);
  });

  it('should increase quantity if same item with same note/time is added again', () => {
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    expect(component.orderItems.length).toBe(1);
    expect(component.orderItems[0].quantity).toBe(2);
  });

  it('should remove item from order', () => {
    component.addToOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    component.removeFromOrder(mockMenuItems[0], 'ohne Dressing', '12:00');
    expect(component.orderItems.length).toBe(0);
  });

  it('should update note of an order item', () => {
    component.addToOrder(mockMenuItems[0], 'alt', '12:00');
    component.updateNote(mockMenuItems[0], 'alt', 'neu');
    expect(component.orderItems[0].note).toBe('neu');
  });

  it('should change quantity with delta', () => {
    component.addToOrder(mockMenuItems[0], '', '12:00');
    component.changeQuantity(mockMenuItems[0], '', '12:00', 1);
    expect(component.orderItems[0].quantity).toBe(2);
    component.changeQuantity(mockMenuItems[0], '', '12:00', -5);
    expect(component.orderItems[0].quantity).toBe(1); // Mindestmenge 1
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
    expect(cartServiceSpy.saveCartItems).toHaveBeenCalledWith(component.orderItems);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/warenkorb']);
  });
});
