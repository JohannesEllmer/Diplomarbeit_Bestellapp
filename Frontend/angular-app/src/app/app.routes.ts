import { Routes } from '@angular/router';
import { MenuPlanComponent } from './menu-plan-component/menu-plan-component';
import { CartPageComponent } from './cart-page/cart-page';
import { UserManagementComponent } from './user-management/user-management';
import { OrderListComponent } from './order-list/order-list';
import { OrderOverviewComponent } from './order-overview/order-overview';
import { StatisticsPageComponent } from './statistics-page/statistics-page';
import { MenuManager } from './menu-manager/menu-manager';
import { MenuPlanner } from './menu-planner/menu-planner';
import { DishEditor } from './dish-editor/dish-editor';

import { LoginPageComponent } from './login-page/login-page';
import { RegisterPageComponent } from './register-page/register-page';
import { authGuard } from './auth/auth.guard';
import { VerifyEmailPage } from './register-page/verify-email';
import { ForgotPasswordPage } from './login-page/forgot-password';
import { ResetPasswordPage } from './login-page/reset-password';
import { ChangePasswordPage } from './login-page/change-password';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'verify-email', component: VerifyEmailPage },
  { path: 'forgot-password', component: ForgotPasswordPage },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'change-password', component: ChangePasswordPage, canActivate: [authGuard()] },


  { path: '', component: MenuPlanComponent, canActivate: [authGuard()] },
  { path: 'warenkorb', component: CartPageComponent, canActivate: [authGuard()] },
  { path: 'user', component: UserManagementComponent, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'my-orders', component: OrderOverviewComponent, canActivate: [authGuard(['KUNDE', 'ADMIN'])] },
  { path: 'orders', component: OrderListComponent, canActivate: [authGuard(['INHABER', 'ADMIN'])] },
  { path: 'statistics', component: StatisticsPageComponent, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'menu-manager', component: MenuManager, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'menuplaner', component: MenuPlanner, canActivate: [authGuard(['INHABER', 'ADMIN'])] },
  { path: 'gericht-verwaltung', component: DishEditor, canActivate: [authGuard(['ADMIN', 'INHABER'])] }
];
