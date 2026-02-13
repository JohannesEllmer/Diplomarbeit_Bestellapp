import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class PolicyRedirectInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const code = (err as any)?.error?.error;

        if (err.status === 403 && code === 'USER_PROFILE_UPDATE_REQUIRED') {
          //zum Profil leiten
          this.router.navigate(['/user-profile']);
        }

        return throwError(() => err);
      })
    );
  }
}
