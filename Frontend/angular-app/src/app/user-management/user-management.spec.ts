import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management';
import { UserService } from '../services/user/user-service';
import { User } from '../../models/user.model';
import { of } from 'rxjs';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;

  const mockUsers: User[] = [
    { id: "1", name: 'Max', email: 'max@example.com', class: '10A', orderCount: 5, balance: 20, blocked: false },
    { id: "2", name: 'Lisa', email: 'lisa@example.com', class: '10B', orderCount: 3, balance: 15, blocked: false },
    { id: "3", name: 'Tom', email: 'tom@example.com', class: '10C', orderCount: 2, balance: 10, blocked: false }
  ];

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser', 'toggleBlockUser']);

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    mockUserService.getUsers.and.returnValue(of(mockUsers));
    fixture.detectChanges();
  });

  it('should load users on init', () => {
    expect(component.users.length).toBe(3);
    expect(component.paginatedUsers.length).toBe(3);
  });

  it('should calculate total pages correctly', () => {
    component.usersPerPage = 2;
    expect(component.totalPages).toBe(2);
  });

  it('should change page correctly', () => {
    component.usersPerPage = 1;
    component.changePage(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedUsers[0].id).toBe("2");
  });

  it('should change users per page and reset to page 1', () => {
    component.changeUsersPerPage(1);
    expect(component.usersPerPage).toBe(1);
    expect(component.currentPage).toBe(1);
    expect(component.paginatedUsers.length).toBe(1);
  });

  it('should delete user and update pagination', () => {
   mockUserService.deleteUser.and.returnValue(of(undefined));

    component.deleteUser(mockUsers[0]);
    expect(mockUserService.deleteUser).toHaveBeenCalledWith("1");
    expect(component.users.find(u => u.id == "1")).toBeUndefined();
  });

  it('should block user and update list', () => {
    const updatedUser = { ...mockUsers[1], blocked: true };
    mockUserService.toggleBlockUser.and.returnValue(of(updatedUser));

    component.blockUser(mockUsers[1]);

    expect(mockUserService.toggleBlockUser).toHaveBeenCalledWith(mockUsers[1]);
    expect(component.users.find(u => u.id == "2")?.blocked).toBeTrue();
  });
});
