  import { Routes } from '@angular/router';
import { MenuPlanComponent } from './menu-plan-component/menu-plan-component';
import { CartPageComponent } from './cart-page/cart-page';
import { UserManagementComponent } from './user-management/user-management';
import { OrderListComponent } from './order-list/order-list';
import { StatisticsPageComponent } from './statistics-page/statistics-page';
  import {MenuManager} from './menu-manager/menu-manager';
  import {MenuPlanner} from './menu-planner/menu-planner';
  import {DishEditor} from './dish-editor/dish-editor';

export const routes: Routes = [
  { path: '', component: MenuPlanComponent },
  { path: 'warenkorb', component: CartPageComponent },
  { path: 'user', component: UserManagementComponent },
  { path: 'orders', component: OrderListComponent },
  { path: 'statistics', component: StatisticsPageComponent },
  { path: 'menu-manager', component: MenuManager},
  { path: 'menuplaner', component: MenuPlanner},
  { path: 'gericht-verwaltung', component: DishEditor}
];
