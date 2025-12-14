import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordPage {
  loading = false;
  done = false;

  // ✅ FIX: wird im Template verwendet
  error = '';

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    const stateEmail = (this.router.getCurrentNavigation()?.extras?.state as any)?.email as string | undefined;
    const storedEmail = (localStorage.getItem('last_login_email') ?? '').trim();
    const initialEmail = (stateEmail ?? storedEmail ?? '').trim();

    this.form = this.fb.group({
      email: [initialEmail, [Validators.required, Validators.email]]
    });
  }

  get email() { return this.form.get('email'); }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.done = false;
    this.error = '';

    const email = String(this.form.value.email ?? '').trim();

    localStorage.setItem('last_login_email', email);

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.done = true;

        // Optional (wenn du Technikfehler zeigen willst):
        // this.error = 'Technischer Fehler beim Senden. Bitte später erneut versuchen.';
      }
    });
  }
}
