import { TestBed } from '@angular/core/testing';

import { MenuPlanner } from './menu-planner';

describe('MenuPlanner', () => {
  let service: MenuPlanner;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MenuPlanner);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
