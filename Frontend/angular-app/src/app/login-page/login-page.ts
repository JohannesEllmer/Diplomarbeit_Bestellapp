import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css']
})
export class LoginPageComponent {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  showPassword = false; 

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value as {
      email: string;
      password: string;
    };

    localStorage.setItem('last_login_email', (email ?? '').trim());

    this.auth.login(email, password).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isSubmitting = false;

        const code = err?.error?.error;

        if (code === 'EMAIL_NOT_VERIFIED') {
          this.errorMessage =
            'Bitte bestätige zuerst deine E-Mail-Adresse.';
          return;
        }

        if (code === 'USER_BLOCKED') {
          this.errorMessage =
            'Dein Account ist gesperrt.';
          return;
        }

        if (code === 'INVALID_CREDENTIALS') {
          this.errorMessage =
            'Ungültige Login-Daten.';
          return;
        }

        this.errorMessage =
          'Login fehlgeschlagen. Bitte versuche es erneut.';
        console.error(err);
      }
    });
  }
}