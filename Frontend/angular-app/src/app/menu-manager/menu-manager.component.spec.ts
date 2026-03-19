import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuManager } from './menu-manager';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { MenuManagerService } from '../services/menu-manager/menu-manager';
import { SettingsService } from '../services/settings/settings.service';

describe('MenuManagerComponent', () => {
  let component: MenuManager;
  let fixture: ComponentFixture<MenuManager>;
  let mockRouter: any;
  let mockMenuService: any;
  let mockSettingsService: any;

  beforeEach(async () => {
    mockRouter = { navigate: jasmine.createSpy('navigate') };

    mockMenuService = {
      getMenus: jasmine.createSpy('getMenus').and.returnValue(of([
        { id: 'm1', title: 'Mittagsmenü', menuItems: [] },
        { id: 'm2', title: 'Abendkarte', menuItems: [] }
      ])),
      getSelectedMealPlan: jasmine.createSpy('getSelectedMealPlan').and.returnValue(of({ id: 'm1' })), // ✅ also set active menu
      setSelected: jasmine.createSpy('setSelected').and.returnValue(of({ ok: true })),
      deleteMenu: jasmine.createSpy('deleteMenu').and.returnValue(of({})),
    };

    mockSettingsService = {
      getOrderingEnabled: jasmine.createSpy('getOrderingEnabled').and.returnValue(of({ orderingEnabled: true })),
      setOrderingEnabled: jasmine.createSpy('setOrderingEnabled').and.returnValue(of({ ok: true, orderingEnabled: false })),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, MenuManager],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: MenuManagerService, useValue: mockMenuService },
        { provide: SettingsService, useValue: mockSettingsService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuManager);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call selectMenu when a menu is clicked', () => {
    spyOn(component, 'selectMenu');
    const menuEl = fixture.debugElement.queryAll(By.css('.menu-container'))[1];
    menuEl.triggerEventHandler('click', null);
    expect(component.selectMenu).toHaveBeenCalledWith(component.Menus[1]);
  });

  it('should call printMenu, goToMenuPlanner and removeMenu as expected', () => {
    spyOn(component, 'printMenu');
    spyOn(component, 'goToMenuPlanner');
    spyOn(component, 'removeMenu');

    const printBtn = fixture.debugElement.query(By.css('.menu-action-btn[title="Menü drucken"]'));
    printBtn.triggerEventHandler('click', new Event('click'));
    expect(component.printMenu).toHaveBeenCalledWith(component.Menus[0]);

    const editBtn = fixture.debugElement.query(By.css('.menu-action-btn[title="Menü bearbeiten"]'));
    editBtn.triggerEventHandler('click', new Event('click'));
    expect(component.goToMenuPlanner).toHaveBeenCalledWith(component.Menus[0]);

    const deleteBtn = fixture.debugElement.query(By.css('.menu-action-btn[title="Menü entfernen"]'));
    deleteBtn.triggerEventHandler('click', new Event('click'));
    expect(component.removeMenu).toHaveBeenCalledWith(component.Menus[0]);
  });

  it('should trigger goToMenuPlanner when add menu button clicked', () => {
    spyOn(component, 'goToMenuPlanner');
    const addBtn = fixture.debugElement.query(By.css('.add-menu-button'));
    addBtn.triggerEventHandler('click', new Event('click'));
    expect(component.goToMenuPlanner).toHaveBeenCalled();
  });

  it('should toggle ordering when ordering button is clicked', () => {
    spyOn(component, 'toggleOrdering');
    const toggleBtn = fixture.debugElement.queryAll(By.css('.add-menu-button'))[1];
    toggleBtn.triggerEventHandler('click', new Event('click'));
    expect(component.toggleOrdering).toHaveBeenCalled();
  });
});
