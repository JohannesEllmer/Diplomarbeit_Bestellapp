import { TestBed } from '@angular/core/testing';

import { ShoppingCartComponent } from '../shopping-cart/shopping-cart';

describe('ShoppingCart', () => {
  let service: ShoppingCartComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShoppingCartComponent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
