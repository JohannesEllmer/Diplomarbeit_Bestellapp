import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserItems } from './user-items';

describe('UserItems', () => {
  let component: UserItems;
  let fixture: ComponentFixture<UserItems>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserItems]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserItems);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
