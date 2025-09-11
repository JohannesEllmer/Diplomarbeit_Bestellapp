import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishEditor } from './dish-editor';

describe('DishEditor', () => {
  let component: DishEditor;
  let fixture: ComponentFixture<DishEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DishEditor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DishEditor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
