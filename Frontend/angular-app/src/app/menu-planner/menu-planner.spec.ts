import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuPlanner } from './menu-planner';

describe('MenuPlanner', () => {
  let component: MenuPlanner;
  let fixture: ComponentFixture<MenuPlanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPlanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuPlanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
