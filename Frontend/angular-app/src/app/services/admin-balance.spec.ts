import { TestBed } from '@angular/core/testing';

import { AdminBalance } from './admin-balance';

describe('AdminBalance', () => {
  let service: AdminBalance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminBalance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
