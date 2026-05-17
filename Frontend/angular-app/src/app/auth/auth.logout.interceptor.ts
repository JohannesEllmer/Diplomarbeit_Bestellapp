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
import { AuthService } from './auth.service'; 

@Injectable()
export class AutoLogoutInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        
        const message = (err as any)?.error?.message;
        const code = (err as any)?.error?.error;

        if (err.status === 401) {
              this.auth.logoutIfNeeded();
        }

        return throwError(() => err);
      })
    );
  }
}
