import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
  templateUrl: './change-password.html',
  styleUrls: ['./reset-password.css'],
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
      { validators: [passwordsMatch] },
    );
  }

  get oldPw() {
    return this.form.get('oldPw');
  }
  get newPw() {
    return this.form.get('newPw');
  }
  get newPw2() {
    return this.form.get('newPw2');
  }

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
        this.error =
          code === 'INVALID_CREDENTIALS'
            ? 'Aktuelles Passwort ist falsch.'
            : 'Passwort ändern fehlgeschlagen.';
      },
    });
  }
}
