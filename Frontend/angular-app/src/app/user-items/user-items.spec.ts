import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserItemsComponent } from './user-items';
import { Router } from '@angular/router';
import { UserService } from '../services/user/user-service';
import { User } from '../../models/user.model';
import { of } from 'rxjs';

describe('UserItemsComponent', () => {
  let component: UserItemsComponent;
  let fixture: ComponentFixture<UserItemsComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserService: jasmine.SpyObj<UserService>;

  const mockUser: User = {
    id: 1,
    name: 'Max Mustermann',
    email: 'max@example.com',
    class: '10A',
    orderCount: 5,
    balance: 20,
    blocked: false
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockUserService = jasmine.createSpyObj('UserService', ['updateBalance']);

    await TestBed.configureTestingModule({
      imports: [UserItemsComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserItemsComponent);
    component = fixture.componentInstance;
    component.user = { ...mockUser };
    fixture.detectChanges();
  });

  it('should toggle user details', () => {
    const event = new Event('click');
    component.toggleDetails(event);
    expect(component.user.showDetails).toBeTrue();
  });

  it('should start editing balance', () => {
    const event = new Event('click');
    component.startEditBalance(event);
    expect(component.user.editingBalance).toBeTrue();
    expect(component.user.newBalance).toBe(0);
  });

  it('should save balance and update user', () => {
    const event = new Event('click');
    component.user.newBalance = 50;
    mockUserService.updateBalance.and.returnValue(of({ ...mockUser, balance: 50 }));

    component.saveBalance(event);

    expect(mockUserService.updateBalance).toHaveBeenCalledWith(component.user, 50);
    mockUserService.updateBalance(component.user, 50).subscribe(() => {
      expect(component.user.balance).toBe(50);
      expect(component.user.editingBalance).toBeFalse();
    });
  });

  it('should emit delete event', () => {
    const event = new Event('click');
    spyOn(component.delete, 'emit');
    component.emitDelete(event);
    expect(component.delete.emit).toHaveBeenCalledWith(component.user);
  });

  it('should emit block event', () => {
    const event = new Event('click');
    spyOn(component.block, 'emit');
    component.emitBlock(event);
    expect(component.block.emit).toHaveBeenCalledWith(component.user);
  });

  it('should navigate to user detail page', () => {
    const event = new Event('click');
    component.navigateToUser(event);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users', component.user.id]);
  });
});
