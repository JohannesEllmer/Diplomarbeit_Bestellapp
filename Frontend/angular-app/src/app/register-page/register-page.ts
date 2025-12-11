/*import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css']
})
export class RegisterPageComponent implements OnDestroy {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  nameInfoMessage = 'Vor- und Nachname werden automatisch aus der E-Mail abgeleitet.';
  private emailSub?: Subscription;
  private schoolTypeSub?: Subscription;

  schoolTypes: ('HTL' | 'HAK')[] = ['HTL', 'HAK'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        schoolType: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        class: ['', [Validators.required]],
        isTeacher: [false],
        firstName: [{ value: '', disabled: true }, [Validators.required]],
        lastName: [{ value: '', disabled: true }, [Validators.required]]
      },
      { validators: [this.schoolEmailValidator()] }
    );

    this.emailSub = this.registerForm.get('email')?.valueChanges.subscribe(() =>
      this.updateNameFromEmail()
    );
    this.schoolTypeSub = this.registerForm.get('schoolType')?.valueChanges.subscribe(() =>
      this.updateNameFromEmail()
    );
  }

  get email() { return this.registerForm.get('email'); }
  get classCtrl() { return this.registerForm.get('class'); }
  get schoolType() { return this.registerForm.get('schoolType'); }
  get password() { return this.registerForm.get('password'); }
  get isTeacher() { return this.registerForm.get('isTeacher'); }
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }

  private schoolEmailValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const email = group.get('email')?.value as string;
      const school = group.get('schoolType')?.value as 'HTL' | 'HAK' | '';

      if (!email || !school) return null;

      const htlPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@htl-saalfelden\.at$/i;
      const hakPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@johak\.at$/i;

      let isValid = false;
      if (school === 'HTL') isValid = htlPattern.test(email);
      if (school === 'HAK') isValid = hakPattern.test(email);

      return isValid ? null : { schoolEmailMismatch: true };
    };
  }

  private updateNameFromEmail(): void {
    const email = (this.email?.value || '').trim();
    const school = this.schoolType?.value as 'HTL' | 'HAK' | '';

    if (!email || !school) {
      this.registerForm.patchValue({ firstName: '', lastName: '' }, { emitEvent: false });
      return;
    }

    const htlPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@htl-saalfelden\.at$/i;
    const hakPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@johak\.at$/i;

    let first = '';
    let last = '';
    let match: RegExpMatchArray | null = null;

    if (school === 'HTL') {
      match = email.match(htlPattern);
      if (match) {
        first = this.capitalize(match[1]);      // vorname
        last = this.capitalize(match[2]);       // nachname
      }
    } else if (school === 'HAK') {
      match = email.match(hakPattern);
      if (match) {
        last = this.capitalize(match[1]);       // nachname
        first = this.capitalize(match[2]);      // vorname
      }
    }

    if (match) {
      this.registerForm.patchValue(
        { firstName: first, lastName: last },
        { emitEvent: false }
      );
      this.nameInfoMessage = 'Name erfolgreich aus der E-Mail abgeleitet.';
    } else {
      this.registerForm.patchValue(
        { firstName: '', lastName: '' },
        { emitEvent: false }
      );
      this.nameInfoMessage =
        'E-Mail muss zum gewählten Schultyp passen (HTL: vorname.nachname@htl-saalfelden.at, HAK: nachname.vorname@johak.at).';
    }
  }

  private capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();

    if (!raw.firstName || !raw.lastName) {
      this.errorMessage = 'Vor- und Nachname konnten aus der E-Mail nicht gelesen werden.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.checkAccountExists(raw.email).pipe(
      switchMap((exists) => {
        if (exists) {
          this.isSubmitting = false;
          this.errorMessage = 'Es existiert bereits ein Account mit dieser E-Mail-Adresse.';
          throw new Error('ACCOUNT_EXISTS');
        }

        return this.auth.register({
          email: raw.email,
          password: raw.password,
          firstName: raw.firstName,
          lastName: raw.lastName,
          class: raw.class,
          schoolType: raw.schoolType,
          isTeacher: raw.isTeacher
        });
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        if (err?.message === 'ACCOUNT_EXISTS') return;
        this.isSubmitting = false;
        this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
        console.error(err);
      }
    });
  }

  ngOnDestroy(): void {
    this.emailSub?.unsubscribe();
    this.schoolTypeSub?.unsubscribe();
  }
}
*/
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register-page.html',
  styleUrls: ['./register-page.css']
})
export class RegisterPageComponent implements OnDestroy {

  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  nameInfoMessage = 'Vor- und Nachname werden automatisch aus der E-Mail abgeleitet.';

  private emailSub?: Subscription;
  private schoolTypeSub?: Subscription;

  schoolTypes: ('HTL' | 'HAK')[] = ['HTL', 'HAK'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        schoolType: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        class: ['', [Validators.required]],
        isTeacher: [false],
        firstName: [{ value: '', disabled: true }, [Validators.required]],
        lastName: [{ value: '', disabled: true }, [Validators.required]]
      },
      { validators: [this.schoolEmailValidator()] }
    );

    this.emailSub = this.email?.valueChanges.subscribe(() => this.updateNameFromEmail());
    this.schoolTypeSub = this.schoolType?.valueChanges.subscribe(() => this.updateNameFromEmail());
  }

  // ===== Getter =====
  get email() { return this.registerForm.get('email'); }
  get classCtrl() { return this.registerForm.get('class'); }
  get schoolType() { return this.registerForm.get('schoolType'); }
  get password() { return this.registerForm.get('password'); }
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }

  // ===== Validators =====
  private schoolEmailValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const email = group.get('email')?.value as string;
      const school = group.get('schoolType')?.value as 'HTL' | 'HAK' | '';

      if (!email || !school) return null;

      const htlPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@htl-saalfelden\.at$/i;
      const hakPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@johak\.at$/i;

      if (school === 'HTL') return htlPattern.test(email) ? null : { schoolEmailMismatch: true };
      if (school === 'HAK') return hakPattern.test(email) ? null : { schoolEmailMismatch: true };

      return null;
    };
  }

  // ===== Name aus Email generieren =====
  private updateNameFromEmail(): void {
    const email = (this.email?.value || '').trim();
    const school = this.schoolType?.value;

    if (!email || !school) {
      this.registerForm.patchValue({ firstName: '', lastName: '' }, { emitEvent: false });
      return;
    }

    const htlPattern = /^([A-Za-zÄÖÜäöüß]+)\.([A-Za-zÄÖÜäöüß]+)@htl-saalfelden\.at$/i;
    const hakPattern = /^([A-Za-zÄÖÜäöüß]+)\.([A-Za-zÄÖÜäöüß]+)@johak\.at$/i;

    let match: RegExpMatchArray | null = null;

    if (school === 'HTL') match = email.match(htlPattern);
    if (school === 'HAK') match = email.match(hakPattern);

    if (!match) {
      this.registerForm.patchValue({ firstName: '', lastName: '' }, { emitEvent: false });
      this.nameInfoMessage = 'E-Mail passt nicht zum gewählten Schultyp.';
      return;
    }

    let first = '';
    let last = '';

    if (school === 'HTL') {
      first = this.capitalize(match[1]);
      last = this.capitalize(match[2]);
    } else {
      last = this.capitalize(match[1]);
      first = this.capitalize(match[2]);
    }

    this.registerForm.patchValue({ firstName: first, lastName: last }, { emitEvent: false });
    this.nameInfoMessage = 'Name erfolgreich aus der E-Mail abgeleitet.';
  }

  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
  }

  // ===== Registrierung =====
  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();

    if (!raw.firstName || !raw.lastName) {
      this.errorMessage = 'Vor- und Nachname konnten nicht aus der E-Mail gelesen werden.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.checkAccountExists(raw.email)
      .pipe(
        switchMap(exists => {
          if (exists) {
            this.isSubmitting = false;
            this.errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
            throw new Error('ACCOUNT_EXISTS');
          }

          return this.auth.register({
            email: raw.email,
            password: raw.password,
            firstName: raw.firstName,
            lastName: raw.lastName,
            class: raw.class,
            schoolType: raw.schoolType,
            isTeacher: raw.isTeacher
          });
        })
      )
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/login']);
        },
        error: () => {
          this.isSubmitting = false;
          this.errorMessage = 'Registrierung fehlgeschlagen.';
        }
      });
  }

  ngOnDestroy(): void {
    this.emailSub?.unsubscribe();
    this.schoolTypeSub?.unsubscribe();
  }
}
