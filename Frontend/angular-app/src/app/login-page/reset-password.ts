import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
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
  const pw = group.get('pw')?.value ?? '';
  const pw2 = group.get('pw2')?.value ?? '';
  if (!pw || !pw2) return null;
  return pw === pw2 ? null : { pwMismatch: true };
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css'],
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
      { validators: [passwordsMatch] },
    );

    this.route.queryParamMap.subscribe((params) => {
      this.token = params.get('token');
      this.success = false;
      this.error = this.token ? '' : 'Token fehlt.';
    });
  }

  get pw() {
    return this.form.get('pw');
  }
  get pw2() {
    return this.form.get('pw2');
  }

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
        this.error =
          code === 'INVALID_OR_EXPIRED_TOKEN'
            ? 'Token ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'
            : 'Passwort-Reset fehlgeschlagen. Bitte versuche es erneut.';
      },
    });
  }
}
