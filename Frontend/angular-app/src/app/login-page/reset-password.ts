import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('pw')?.value ?? '';
  const pw2 = group.get('pw2')?.value ?? '';
  if (!pw || !pw2) return null;
  return pw === pw2 ? null : { pwMismatch: true };
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Passwort zurücksetzen</h1>
        <p>Lege ein neues Passwort für deinen Account fest.</p>
      </div>

      <div class="status-card is-warning" *ngIf="!token">
        <div class="status-icon">!</div>
        <div class="status-text">
          <div class="status-title">Link ungültig</div>
          <div class="status-msg">Token fehlt. Bitte öffne den Link erneut oder fordere einen neuen an.</div>
        </div>
      </div>

      <form *ngIf="token" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group" [class.invalid]="pw?.invalid && (pw?.touched || pw?.dirty)">
          <label for="pw">Neues Passwort</label>
          <input id="pw" type="password" formControlName="pw" placeholder="mind. 6 Zeichen" autocomplete="new-password" />
          <div class="error" *ngIf="pw?.errors && (pw?.touched || pw?.dirty)">
            <span *ngIf="pw?.errors?.['required']">Passwort ist erforderlich.</span>
            <span *ngIf="pw?.errors?.['minlength']">Mindestens 6 Zeichen.</span>
          </div>
        </div>

        <div class="form-group" [class.invalid]="(pw2?.invalid && (pw2?.touched || pw2?.dirty)) || form.hasError('pwMismatch')">
          <label for="pw2">Passwort bestätigen</label>
          <input id="pw2" type="password" formControlName="pw2" placeholder="nochmals eingeben" autocomplete="new-password" />
          <div class="error" *ngIf="(pw2?.touched || pw2?.dirty) && (pw2?.errors || form.hasError('pwMismatch'))">
            <span *ngIf="pw2?.errors?.['required']">Bitte bestätige dein Passwort.</span>
            <span *ngIf="form.hasError('pwMismatch')">Passwörter stimmen nicht überein.</span>
          </div>
        </div>

        <button class="primary-btn" type="submit" [disabled]="loading || form.invalid">
          <span class="btn-row">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Speichern...' : 'Passwort speichern' }}
          </span>
        </button>

        <div class="status-card is-success" *ngIf="success">
          <div class="status-icon">✓</div>
          <div class="status-text">
            <div class="status-title">Passwort geändert</div>
            <div class="status-msg">Du kannst dich jetzt einloggen.</div>
          </div>
        </div>

        <div class="status-card is-error" *ngIf="error">
          <div class="status-icon">✕</div>
          <div class="status-text">
            <div class="status-title">Fehler</div>
            <div class="status-msg">{{ error }}</div>
          </div>
        </div>

        <div class="auth-footer">
          <a routerLink="/login">Zurück zum Login</a>
        </div>
      </form>
    </div>
  </div>
  `,
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordPage {
  token: string | null = null;
  loading = false;
  success = false;
  error = '';

  form: FormGroup;

  constructor(private route: ActivatedRoute, private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group(
      {
        pw: ['', [Validators.required, Validators.minLength(6)]],
        pw2: ['', [Validators.required]],
      },
      { validators: [passwordsMatch] }
    );

    // ✅ robust (auch bei Navigation innerhalb der App)
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token');
      this.success = false;
      this.error = this.token ? '' : 'Token fehlt.';
    });
  }

  get pw() { return this.form.get('pw'); }
  get pw2() { return this.form.get('pw2'); }

  submit(): void {
    if (!this.token) {
      this.error = 'Token fehlt.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = false;

    const newPw = String(this.form.value.pw);

    this.auth.resetPassword(this.token, newPw).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        const code = err?.error?.error;
        this.error = code === 'INVALID_OR_EXPIRED_TOKEN'
          ? 'Token ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'
          : 'Passwort-Reset fehlgeschlagen. Bitte versuche es erneut.';
      }
    });
  }
}
