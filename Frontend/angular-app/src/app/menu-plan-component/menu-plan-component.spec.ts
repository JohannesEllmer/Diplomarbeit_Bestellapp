import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuPlanComponent } from './menu-plan-component';

describe('MenuPlan', () => {
  let component: MenuPlanComponent;
  let fixture: ComponentFixture<MenuPlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
