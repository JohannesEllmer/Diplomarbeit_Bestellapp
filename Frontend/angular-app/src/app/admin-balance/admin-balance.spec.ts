import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminBalance } from './admin-balance';

describe('AdminBalance', () => {
  let component: AdminBalance;
  let fixture: ComponentFixture<AdminBalance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBalance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminBalance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
