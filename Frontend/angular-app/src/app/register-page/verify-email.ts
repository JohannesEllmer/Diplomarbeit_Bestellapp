import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subject, of } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil, tap, timeout, retry } from 'rxjs/operators';

type Status = 'loading' | 'success' | 'error' | 'missing';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.css']
})
export class VerifyEmailPage implements OnDestroy {
  status: Status = 'loading';
  title = 'E-Mail bestätigen';
  message = 'Bestätigung läuft…';
  details = '';
  autoRedirectSeconds = 3;

  private destroy$ = new Subject<void>();
  private redirectTimer?: any;

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router
  ) {
    this.route.queryParamMap
      .pipe(
        takeUntil(this.destroy$),
        map(q => (q.get('token') ?? '').trim()),
        tap(token => this.start(token)),
        switchMap(token => {
          if (!token) {
            this.setMissing();
            return of(null);
          }

          this.setLoading();

          return this.auth.verifyEmail(token).pipe(
            timeout(8000),
            retry(1),
            tap(() => this.setSuccess()),
            catchError((err) => {
              this.setError(this.mapError(err));
              return of(null);
            }),
            finalize(() => {
            })
          );
        })
      )
      .subscribe();
  }

  private start(_token: string) {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = undefined;
    }
    this.details = '';
  }

  private setLoading() {
    this.status = 'loading';
    this.title = 'E-Mail wird bestätigt…';
    this.message = 'Bitte kurz warten. Das dauert meist nur ein paar Sekunden.';
    this.details = '';
  }

  private setSuccess() {
    this.status = 'success';
    this.title = 'E-Mail bestätigt';
    this.message = 'Dein Account ist jetzt aktiviert. Du kannst dich ab sofort einloggen.';
    this.details = `Weiterleitung zum Login in ${this.autoRedirectSeconds} Sekunden…`;

    this.redirectTimer = setTimeout(() => {
      this.router.navigate(['/login'], {
        state: { email: localStorage.getItem('last_login_email') ?? '' }
      });
    }, this.autoRedirectSeconds * 1000);
  }

  private setMissing() {
    this.status = 'missing';
    this.title = 'Token fehlt';
    this.message = 'Der Bestätigungslink ist unvollständig (kein Token).';
    this.details = 'Bitte öffne den Link aus der E-Mail erneut oder fordere eine neue Bestätigung an.';
  }

  private setError(msg: { title: string; message: string; details?: string }) {
    this.status = 'error';
    this.title = msg.title;
    this.message = msg.message;
    this.details = msg.details ?? '';
  }

  private mapError(err: any): { title: string; message: string; details?: string } {
    // HttpErrorResponse
    const status = err?.status;

    const code = err?.error?.error;

    if (status === 0) {
      return {
        title: 'Keine Verbindung zum Server',
        message: 'Bitte prüfe Netzwerk, Backend-URL und CORS.',
        details: 'Wenn du im LAN bist: Backend muss auf 0.0.0.0 hören und die richtige IP/Origin erlauben.'
      };
    }

    if (code === 'INVALID_OR_EXPIRED_TOKEN' || status === 400) {
      return {
        title: 'Link ungültig oder abgelaufen',
        message: 'Dieser Bestätigungslink ist nicht mehr gültig.',
        details: 'Bitte registriere dich erneut oder fordere eine neue Bestätigungs-E-Mail an.'
      };
    }

    if (status === 500) {
      return {
        title: 'Serverfehler',
        message: 'Beim Bestätigen ist ein Fehler aufgetreten.',
        details: 'Bitte versuche es später erneut. Falls es bleibt: Backend-Logs prüfen.'
      };
    }

    if (err?.name === 'TimeoutError') {
      return {
        title: 'Zeitüberschreitung',
        message: 'Der Server antwortet zu langsam.',
        details: 'Bitte Seite neu laden. Falls dauerhaft: Backend/DB/SMTP prüfen.'
      };
    }

    return {
      title: 'Bestätigung fehlgeschlagen',
      message: 'Bitte versuche es erneut.',
      details: 'Wenn das Problem bleibt: Token/Backend-Route prüfen.'
    };
  }

  goLogin() {
    this.router.navigate(['/login'], {
      state: { email: localStorage.getItem('last_login_email') ?? '' }
    });
  }

  retryNow() {
    const token = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/verify-email'], { queryParams: { token } });
    });
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
