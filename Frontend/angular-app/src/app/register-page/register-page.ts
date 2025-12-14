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
import { Subscription, switchMap, of, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';

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
  infoMessage = '';
  infoType: 'info' | 'success' | 'warning' = 'info';

  nameInfoMessage = 'Vor- und Nachname werden automatisch aus der E-Mail abgeleitet.';

  private sub = new Subscription();

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
        class: [''],
        isTeacher: [false],
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]]
      },
      { validators: [this.schoolEmailValidator()] }
    );

    // ✅ Reaktiv & schnell: nur 1 Subscription für Email+SchoolType
    const email$ = this.email!.valueChanges.pipe(
      startWith(this.email!.value),
      map(v => (String(v ?? '').trim())),
      debounceTime(120),
      distinctUntilChanged()
    );

    const school$ = this.schoolType!.valueChanges.pipe(
      startWith(this.schoolType!.value),
      debounceTime(0),
      distinctUntilChanged()
    );

    this.sub.add(
      combineLatest([email$, school$]).subscribe(([email, school]) => {
        this.updateNameFromEmail(email, school as any);
      })
    );
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
      const email = (group.get('email')?.value as string) || '';
      const school = group.get('schoolType')?.value as 'HTL' | 'HAK' | '';
      if (!email || !school) return null;

      const htlPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@htl-saalfelden\.at$/i;
      const hakPattern = /^([a-zA-ZäöüÄÖÜß]+)\.([a-zA-ZäöüÄÖÜß]+)@johak\.at$/i;

      if (school === 'HTL') return htlPattern.test(email) ? null : { schoolEmailMismatch: true };
      if (school === 'HAK') return hakPattern.test(email) ? null : { schoolEmailMismatch: true };
      return null;
    };
  }

  // ===== Name aus Email generieren (nun mit Parametern) =====
  private updateNameFromEmail(email: string, school: 'HTL' | 'HAK' | ''): void {
    if (!email || !school) {
      this.safePatchNames('', '');
      this.nameInfoMessage = 'Vor- und Nachname werden automatisch aus der E-Mail abgeleitet.';
      return;
    }

    const htlPattern = /^([A-Za-zÄÖÜäöüß]+)\.([A-Za-zÄÖÜäöüß]+)@htl-saalfelden\.at$/i;
    const hakPattern = /^([A-Za-zÄÖÜäöüß]+)\.([A-Za-zÄÖÜäöüß]+)@johak\.at$/i;

    const match =
      school === 'HTL' ? email.match(htlPattern) :
      school === 'HAK' ? email.match(hakPattern) :
      null;

    if (!match) {
      this.safePatchNames('', '');
      this.nameInfoMessage = 'E-Mail muss zum gewählten Schultyp passen.';
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

    this.safePatchNames(first, last);
    this.nameInfoMessage = 'Name erkannt ✓';
  }

  private safePatchNames(first: string, last: string) {
    // ✅ patch nur wenn anders → weniger Change Detection
    const curFirst = this.firstName?.value ?? '';
    const curLast = this.lastName?.value ?? '';
    if (curFirst === first && curLast === last) return;

    this.registerForm.patchValue({ firstName: first, lastName: last }, { emitEvent: false });
  }

  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
  }

  // ===== Registrierung =====
onSubmit(): void {
  this.errorMessage = '';
  this.infoMessage = '';

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    this.infoType = 'warning';
    this.infoMessage = 'Bitte prüfe deine Eingaben (rot markierte Felder).';
    return;
  }

  const raw = this.registerForm.getRawValue();

  // ✅ SOFORT Feedback (damit es nicht "zu spät" wirkt)
  this.isSubmitting = true;
  this.infoType = 'info';
  this.infoMessage = 'Registrierung wird gestartet…es wird Ihnen ein Bestätigungslink per Email zugesendet. Dies kann einen Moment dauern.';

  this.auth.checkAccountExists(raw.email).pipe(
    switchMap(exists => {
      if (exists) {
        this.isSubmitting = false;
        this.infoMessage = ''; // optional: Info ausblenden
        this.errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
        return of(null);
      }

      // ✅ sobald wir wirklich registrieren, direkt die "Mail kommt..." Message zeigen
      this.infoType = 'info';
      this.infoMessage =
        'Fast fertig! Bitte bestätige deine E-Mail. Erst danach wird dein Account erstellt. Dies kann einen Moment dauern.';

      return this.auth.register({
        email: raw.email,
        password: raw.password,
        firstName: raw.firstName,
        lastName: raw.lastName,
        class: (raw.class ?? '').trim(),
        schoolType: raw.schoolType,
        isTeacher: raw.isTeacher
      });
    })
  ).subscribe({
    next: (res) => {
      this.isSubmitting = false;

      if (!res) return;

      // ✅ gleiche Message beibehalten, nur Status "success"
      this.infoType = 'success';
      this.infoMessage =
        'Fast fertig! Bitte bestätige deine E-Mail. Erst danach wird dein Account erstellt';
    },
    error: (err) => {
      this.isSubmitting = false;
      console.error(err);

      // ✅ Info raus, Fehler rein
      this.infoMessage = '';
      this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
    }
  });
}


  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
