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
import { UserPageComponent } from './user-profile/user-profile';
import { BalanceScanComponent } from './admin-balance/admin-balance';
import { ImpressumPageComponent } from './impressum-page/impressum-page';

export const routes: Routes = [
  // Public
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'verify-email', component: VerifyEmailPage },
  { path: 'forgot-password', component: ForgotPasswordPage },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'impressum', component: ImpressumPageComponent },

  // User
  { path: 'user-profile', component: UserPageComponent, canActivate: [authGuard()] },
  { path: 'me', redirectTo: 'user-profile', pathMatch: 'full' },
  { path: 'change-password', component: ChangePasswordPage, canActivate: [authGuard()] },
  { path: 'warenkorb', component: CartPageComponent, canActivate: [authGuard()] },
  { path: 'my-orders', component: OrderOverviewComponent, canActivate: [authGuard()] },
  // Admin
  { path: 'admin/balance-scan', component: BalanceScanComponent, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: '', component: MenuPlanComponent, canActivate: [authGuard()] },

  { path: 'user', component: UserManagementComponent, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'orders', component: OrderListComponent, canActivate: [authGuard(['INHABER', 'ADMIN'])] },

  { path: 'statistics', component: StatisticsPageComponent, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'menu-manager', component: MenuManager, canActivate: [authGuard(['ADMIN', 'INHABER'])] },
  { path: 'menuplaner', component: MenuPlanner, canActivate: [authGuard(['INHABER', 'ADMIN'])] },
  { path: 'gericht-verwaltung', component: DishEditor, canActivate: [authGuard(['ADMIN', 'INHABER'])] },

  // Fallback
  { path: '**', redirectTo: '' }
];
