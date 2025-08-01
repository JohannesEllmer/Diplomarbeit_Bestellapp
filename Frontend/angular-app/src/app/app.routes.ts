import { Routes } from '@angular/router';
import { MenuPlanComponent } from './menu-plan-component/menu-plan-component';
import { CartPageComponent } from './cart-page/cart-page';
import { UserManagementComponent } from './user-management/user-management';

export const routes: Routes = [
  { path: '', component: MenuPlanComponent },
  { path: 'warenkorb', component: CartPageComponent },
  { path: 'user', component: UserManagementComponent }
];
