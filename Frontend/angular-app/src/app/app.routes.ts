  import { Routes } from '@angular/router';
import { MenuPlanComponent } from './menu-plan-component/menu-plan-component';
import { CartPageComponent } from './cart-page/cart-page';
import { UserManagementComponent } from './user-management/user-management';
import { OrderListComponent } from './order-list/order-list';
import { StatisticsPageComponent } from './statistics-page/statistics-page';
  import {MenuManager} from './menu-manager/menu-manager';
  import {MenuPlanner} from './menu-planner/menu-planner';

export const routes: Routes = [
  { path: '', component: MenuPlanComponent },
  { path: 'warenkorb', component: CartPageComponent },
  { path: 'user', component: UserManagementComponent },
  { path: 'orders', component: OrderListComponent },
  { path: 'statistics', component: StatisticsPageComponent },
  { path: 'menü-manager', component: MenuManager},
  { path: 'menüplaner', component: MenuPlanner}
];
