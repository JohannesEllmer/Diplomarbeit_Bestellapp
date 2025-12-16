import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPw')?.value ?? '';
  const pw2 = group.get('newPw2')?.value ?? '';
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
        <h1>Passwort ändern</h1>
        <p>Zur Sicherheit benötigst du dein aktuelles Passwort.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group" [class.invalid]="oldPw?.invalid && (oldPw?.touched || oldPw?.dirty)">
          <label for="oldPw">Aktuelles Passwort</label>
          <input id="oldPw" type="password" formControlName="oldPw" autocomplete="current-password" />
          <div class="error" *ngIf="oldPw?.errors && (oldPw?.touched || oldPw?.dirty)">
            <span *ngIf="oldPw?.errors?.['required']">Aktuelles Passwort ist erforderlich.</span>
          </div>
        </div>

        <div class="form-group" [class.invalid]="newPw?.invalid && (newPw?.touched || newPw?.dirty)">
          <label for="newPw">Neues Passwort</label>
          <input id="newPw" type="password" formControlName="newPw" autocomplete="new-password" />
          <div class="error" *ngIf="newPw?.errors && (newPw?.touched || newPw?.dirty)">
            <span *ngIf="newPw?.errors?.['required']">Neues Passwort ist erforderlich.</span>
            <span *ngIf="newPw?.errors?.['minlength']">Mindestens 6 Zeichen.</span>
          </div>
        </div>

        <div class="form-group" [class.invalid]="(newPw2?.invalid && (newPw2?.touched || newPw2?.dirty)) || form.hasError('pwMismatch')">
          <label for="newPw2">Neues Passwort bestätigen</label>
          <input id="newPw2" type="password" formControlName="newPw2" autocomplete="new-password" />
          <div class="error" *ngIf="(newPw2?.touched || newPw2?.dirty) && (newPw2?.errors || form.hasError('pwMismatch'))">
            <span *ngIf="newPw2?.errors?.['required']">Bitte bestätige das neue Passwort.</span>
            <span *ngIf="form.hasError('pwMismatch')">Passwörter stimmen nicht überein.</span>
          </div>
        </div>

        <button class="primary-btn" type="submit" [disabled]="loading || form.invalid">
          <span class="btn-row">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Speichern...' : 'Passwort ändern' }}
          </span>
        </button>

        <div class="status-card is-success" *ngIf="success">
          <div class="status-icon">✓</div>
          <div class="status-text">
            <div class="status-title">Erledigt</div>
            <div class="status-msg">Dein Passwort wurde geändert.</div>
          </div>
        </div>

        <div class="status-card is-error" *ngIf="error">
          <div class="status-icon">✕</div>
          <div class="status-text">
            <div class="status-title">Fehler</div>
            <div class="status-msg">{{ error }}</div>
          </div>
        </div>
      </form>

      <div class="auth-footer">
        <a routerLink="/">Zurück</a>
      </div>
    </div>
  </div>
  `,
  styleUrls: ['./reset-password.css']
})
export class ChangePasswordPage {
  loading = false;
  success = false;
  error = '';

  form: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group(
      {
        oldPw: ['', [Validators.required]],
        newPw: ['', [Validators.required, Validators.minLength(6)]],
        newPw2: ['', [Validators.required]],
      },
      { validators: [passwordsMatch] }
    );
  }

  get oldPw() { return this.form.get('oldPw'); }
  get newPw() { return this.form.get('newPw'); }
  get newPw2() { return this.form.get('newPw2'); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.success = false;
    this.error = '';

    const oldPassword = String(this.form.value.oldPw);
    const newPassword = String(this.form.value.newPw);

    this.auth.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.form.reset();
      },
      error: (err) => {
        this.loading = false;
        const code = err?.error?.error;
        this.error = code === 'INVALID_CREDENTIALS'
          ? 'Aktuelles Passwort ist falsch.'
          : 'Passwort ändern fehlgeschlagen.';
      }
    });
  }
}
