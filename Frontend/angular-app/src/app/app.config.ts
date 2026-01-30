import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import 'zone.js';
import { routes } from './app.routes';
import { AuthInterceptor } from './auth/auth.interceptor';
import { PolicyRedirectInterceptor } from './auth/policy-redirect.interceptor';
import { AutoLogoutInterceptor } from './auth/auth.logout.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({
      eventCoalescing: true,
      runCoalescing: true,
    }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: PolicyRedirectInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AutoLogoutInterceptor, multi: true },
    provideCharts(withDefaultRegisterables()),
  ],
};
