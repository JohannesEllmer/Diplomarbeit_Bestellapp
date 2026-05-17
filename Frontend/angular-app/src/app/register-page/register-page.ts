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

type SchoolType = 'HTL' | 'HAK' | '';
type RoleType = 'KUNDE' | 'INHABER' | 'ADMIN';
type AdminView = 'USER' | 'MANAGEMENT';

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
  readonly roles: RoleType[] = ['KUNDE', 'INHABER', 'ADMIN'];

  private readonly SCHOOL_CONFIG: Record<
    Exclude<SchoolType, ''>,
    { pattern: RegExp; map: (match: RegExpMatchArray) => { firstName: string; lastName: string } }
  > = {
    HTL: {
      pattern: /^([a-z0-9]+(?:\.[a-z0-9]+)*)@htl-saalfelden\.at$/i,
      map: (m) => ({ firstName: this.capitalize(m[1]), lastName: this.capitalize(m[2]) })
    },
    HAK: {
      pattern: /^([a-z0-9]+(?:\.[a-z0-9]+)*)@johak\.at$/i,
      map: (m) => ({ lastName: this.capitalize(m[1]), firstName: this.capitalize(m[2]) })
    }
  };

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
        lastName: ['', [Validators.required]],

        role: [{ value: 'KUNDE', disabled: true }]
      },
      { validators: [this.schoolEmailValidator()] }
    );

    this.applyRoleControlState();

    const email$ = this.email!.valueChanges.pipe(
      startWith(this.email!.value),
      map(v => String(v ?? '').trim()),
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
        this.updateNameFromEmail(email, school as SchoolType);
      })
    );
  }

  get currentUser(): any | null {
    return this.auth.getCurrentUser();
  }

  get isAdmin(): boolean {
    return (this.currentUser?.role ?? null) === 'ADMIN';
  }

  get adminView(): AdminView {
    return (localStorage.getItem('admin_view') as AdminView) || 'USER';
  }

  get isAdminManagementView(): boolean {
    return this.isAdmin && this.adminView === 'MANAGEMENT';
  }

  private applyRoleControlState(): void {
    const ctrl = this.registerForm.get('role');
    if (!ctrl) return;

    if (this.isAdminManagementView) {
      ctrl.enable({ emitEvent: false });
    } else {
      ctrl.disable({ emitEvent: false });
      ctrl.setValue('KUNDE', { emitEvent: false });
    }
  }

  get email() { return this.registerForm.get('email'); }
  get classCtrl() { return this.registerForm.get('class'); }
  get schoolType() { return this.registerForm.get('schoolType'); }
  get password() { return this.registerForm.get('password'); }
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get roleCtrl() { return this.registerForm.get('role'); }

  //Validierung
  private parseNameFromSchoolEmail(
    email: string,
    school: SchoolType
  ): { firstName: string; lastName: string } | null {
    if (!email || !school) return null;
    if (school !== 'HTL' && school !== 'HAK') return null;

    const cfg = this.SCHOOL_CONFIG[school];
    const match = email.match(cfg.pattern);
    if (!match) return null;

    return cfg.map(match);
  }

  private schoolEmailValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const email = String(group.get('email')?.value ?? '').trim();
      const school = (group.get('schoolType')?.value ?? '') as SchoolType;
      if (!email || !school) return null;

      return this.parseNameFromSchoolEmail(email, school)
        ? null
        : { schoolEmailMismatch: true };
    };
  }

  private updateNameFromEmail(email: string, school: SchoolType): void {
    const parsed = this.parseNameFromSchoolEmail(email, school);

    if (!email || !school) {
      this.safePatchNames('', '');
      this.nameInfoMessage = 'Vor- und Nachname werden automatisch aus der E-Mail abgeleitet.';
      return;
    }

    if (!parsed) {
      this.safePatchNames('', '');
      this.nameInfoMessage = 'E-Mail muss zum gewählten Schultyp passen.';
      return;
    }

    this.safePatchNames(parsed.firstName, parsed.lastName);
    this.nameInfoMessage = 'Name erkannt ✓';
  }

  private safePatchNames(first: string, last: string): void {
    const curFirst = this.firstName?.value ?? '';
    const curLast = this.lastName?.value ?? '';
    if (curFirst === first && curLast === last) return;

    this.registerForm.patchValue({ firstName: first, lastName: last }, { emitEvent: false });
  }

  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
  }

  onSubmit(): void {
    this.applyRoleControlState();

    this.errorMessage = '';
    this.infoMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.infoType = 'warning';
      this.infoMessage = 'Bitte prüfe deine Eingaben (rot markierte Felder).';
      return;
    }
    const raw = this.registerForm.getRawValue();

    this.isSubmitting = true;
    this.infoType = 'info';
    this.infoMessage =
      'Registrierung wird gestartet…es wird Ihnen ein Bestätigungslink per Email zugesendet. Dies kann einen Moment dauern.';

    this.auth.checkAccountExists(raw.email).pipe(
      switchMap(exists => {
        if (exists) {
          this.isSubmitting = false;
          this.infoMessage = '';
          this.errorMessage = 'Diese E-Mail-Adresse ist bereits registriert.';
          return of(null);
        }

        this.infoType = 'info';
        this.infoMessage =
          'Fast fertig! Bitte bestätige deine E-Mail. Erst danach wird dein Account erstellt. Dies kann einen Moment dauern.';

        const payload: any = {
          email: raw.email,
          password: raw.password,
          firstName: raw.firstName,
          lastName: raw.lastName,
          class: (raw.class ?? '').trim(),
          schoolType: raw.schoolType,
          isTeacher: raw.isTeacher
        };

        if (this.isAdminManagementView) {
          payload.role = raw.role as RoleType;
        }

        return this.auth.register(payload);
      })
    ).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (!res) return;

        this.infoType = 'success';
        this.infoMessage =
          'Fast fertig! Bitte bestätige deine E-Mail. Erst danach wird dein Account erstellt';
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);

        this.infoMessage = '';
        this.errorMessage = 'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
