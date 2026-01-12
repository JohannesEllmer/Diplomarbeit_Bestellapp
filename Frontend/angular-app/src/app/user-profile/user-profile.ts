import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { UserProfileService } from '../services/user-profile';
import { AuthService } from '../auth/auth.service';

type StatusType = 'success' | 'warning' | 'error' | '';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css']
})
export class UserPageComponent implements OnInit {
  loading = false;

  profile: any = null;
  activity: any = { orders: [], balanceLogs: [] };

  // Balance edit flow
  editMode = false;
  addAmount = '';
  pendingQr: { id: string; code: string; qrCodeUrl: string } | null = null;

  // Flush flow
  flushQr: { id: string; code: string; qrCodeUrl: string } | null = null;

  classEditMode = false;
  classValue = '';

  pwModalOpen = false;
  pwOld = '';
  pwNew = '';
  pwNew2 = '';
  pwSaving = false;

  // status card
  statusType: StatusType = '';
  statusTitle = '';
  statusMsg = '';

  constructor(
    private api: UserProfileService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll(): void {
    this.loading = true;
    this.clearStatus();

    this.api.getProfile().subscribe({
      next: (p) => {
        this.profile = p;

        // Klasse Feld fürs UI initialisieren
        this.classValue = String(this.profile?.user?.class ?? '').trim();

        this.api.getActivity().subscribe({
          next: (a) => {
            this.activity = a;
            this.loading = false;
          },
          error: (err) => {
            this.loading = false;
            this.setStatus('error', 'Aktivität konnte nicht geladen werden', err?.message || String(err));
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.setStatus('error', 'Profil konnte nicht geladen werden', err?.message || String(err));
      }
    });
  }

  // ------- UI helpers -------
  money(n: any): string {
    const v = Number(n ?? 0);
    return v.toFixed(2).replace('.', ',') + ' €';
  }

  canDeleteAccount(): boolean {
    const balance = Number(this.profile?.balance ?? 0);
    const reserved = Number(this.profile?.reserved ?? 0);
    return balance === 0 && reserved === 0;
  }

  // ✅ robust: "5,00" / "5.00" / "1.234,56" / "1234.56"
  private parseMoneyToNumber(input: any): number {
    const raw = String(input ?? '').trim();
    if (!raw) return NaN;

    let normalized = raw.replace(/\s/g, '');

    const hasDot = normalized.includes('.');
    const hasComma = normalized.includes(',');

    // both present -> '.' thousands, ',' decimal
    if (hasDot && hasComma) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      // only comma -> comma decimal
      normalized = normalized.replace(',', '.');
    }
    // only dot -> dot decimal (leave as is)

    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }

  // ------- Add Balance flow -------
  startEdit(): void {
    this.editMode = true;
    this.addAmount = '';
    this.pendingQr = null;
    this.flushQr = null;
    this.clearStatus();
  }

  cancelEdit(): void {
    this.editMode = false;
    this.addAmount = '';
    this.pendingQr = null;
  }

  saveAddRequest(): void {
    this.clearStatus();

    const delta = this.parseMoneyToNumber(this.addAmount);

    // Debug (kannst du später entfernen)
    console.log('[UserProfile] addAmount=', this.addAmount, 'delta=', delta);

    if (!Number.isFinite(delta) || delta <= 0) {
      this.setStatus('warning', 'Ungültiger Betrag', 'Bitte einen positiven Betrag eingeben.');
      return;
    }

    this.loading = true;
    this.api.createAddRequest(delta).subscribe({
      next: (res) => {
        this.loading = false;
        this.pendingQr = res;
        this.setStatus(
          'success',
          'QR-Code erstellt',
          'Der Inhaber muss diesen QR-Code scannen, damit das Guthaben hinzugefügt wird.'
        );
      },
      error: (err) => {
        this.loading = false;
        this.setStatus('error', 'Konnte QR-Code nicht erstellen', err?.error?.message || err?.message || String(err));
      }
    });
  }

  // ------- Flush Balance flow -------
  requestFlush(): void {
    this.clearStatus();
    this.pendingQr = null;
    this.editMode = false;

    this.loading = true;
    this.api.createFlushRequest().subscribe({
      next: (res) => {
        this.loading = false;
        this.flushQr = res;
        this.setStatus(
          'success',
          'QR-Code zum Ausleeren erstellt',
          'Der Inhaber muss diesen QR-Code scannen, danach wird dein Guthaben auf 0 gesetzt.'
        );
      },
      error: (err) => {
        this.loading = false;
        this.setStatus('error', 'Konnte Ausleeren nicht starten', err?.error?.message || err?.message || String(err));
      }
    });
  }

  // ------- Delete account -------
  deleteAccount(): void {
    this.clearStatus();
    if (!this.canDeleteAccount()) {
      this.setStatus(
        'warning',
        'Löschen nicht möglich',
        'Guthaben muss 0 sein und es dürfen keine offenen Bestellungen existieren.'
      );
      return;
    }

    if (!confirm('Konto wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.')) return;

    this.loading = true;
    this.api.deleteMe().subscribe({
      next: () => {
        this.loading = false;
        this.setStatus('success', 'Konto gelöscht', 'Du wirst jetzt zur Startseite weitergeleitet.');
        setTimeout(() => this.router.navigate(['/']), 600);
      },
      error: (err) => {
        this.loading = false;
        this.setStatus('error', 'Konto konnte nicht gelöscht werden', err?.error?.message || err?.message || String(err));
      }
    });
  }

  // ----------------------------
  // ✅ Klasse edit / update
  // ----------------------------
  startClassEdit(): void {
    this.classEditMode = true;
    this.classValue = String(this.profile?.user?.class ?? '').trim();
    this.clearStatus();
  }

  cancelClassEdit(): void {
    this.classEditMode = false;
    this.classValue = String(this.profile?.user?.class ?? '').trim();
  }

  saveClass(): void {
    const cls = String(this.classValue ?? '').trim();
    if (!cls) {
      this.setStatus('warning', 'Klasse fehlt', 'Bitte eine Klasse eingeben.');
      return;
    }

    this.loading = true;
    this.clearStatus();

    this.api.updateMyClass(cls)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          // ✅ UI updaten
          this.profile.user.class = cls;
          this.profile.user.blocked = false;

          // ✅ local storage user updaten, damit Guard/Header stimmt
          const current = this.auth.getCurrentUser();
          if (current) {
            this.auth.setCurrentUser({ ...(current as any), class: cls, blocked: false } as any);
          }

          this.classEditMode = false;
          this.setStatus('success', 'Klasse aktualisiert', 'Dein Account wurde wieder freigeschaltet.');
          this.refreshAll();
        },
        error: (err) => {
          this.setStatus(
            'error',
            'Klasse konnte nicht gespeichert werden',
            err?.error?.message || err?.message || String(err)
          );
        }
      });
  }

  // ----------------------------
  // ✅ Passwort ändern (Modal)
  // ----------------------------
  openPasswordModal(): void {
    this.pwModalOpen = true;
    this.pwOld = '';
    this.pwNew = '';
    this.pwNew2 = '';
    this.clearStatus();
  }

  closePasswordModal(): void {
    this.pwModalOpen = false;
    this.pwOld = '';
    this.pwNew = '';
    this.pwNew2 = '';
  }

  savePassword(): void {
    const oldPw = String(this.pwOld ?? '');
    const newPw = String(this.pwNew ?? '');
    const newPw2 = String(this.pwNew2 ?? '');

    if (!oldPw || !newPw) {
      this.setStatus('warning', 'Fehlende Daten', 'Bitte altes und neues Passwort eingeben.');
      return;
    }
    if (newPw.length < 6) {
      this.setStatus('warning', 'Passwort zu kurz', 'Bitte mindestens 6 Zeichen verwenden.');
      return;
    }
    if (newPw !== newPw2) {
      this.setStatus('warning', 'Passwörter stimmen nicht überein', 'Bitte wiederholen und prüfen.');
      return;
    }

    this.pwSaving = true;
    this.clearStatus();

    this.auth.changePassword(oldPw, newPw)
      .pipe(finalize(() => (this.pwSaving = false)))
      .subscribe({
        next: () => {
          this.setStatus('success', 'Passwort geändert', 'Dein Passwort wurde erfolgreich geändert.');
          this.closePasswordModal();
        },
        error: (err) => {
          const code = err?.error?.error;
          if (code === 'INVALID_CREDENTIALS') {
            this.setStatus('error', 'Falsches Passwort', 'Das aktuelle Passwort ist nicht korrekt.');
            return;
          }
          this.setStatus('error', 'Passwort konnte nicht geändert werden', err?.error?.message || err?.message || String(err));
        }
      });
  }

  // ------- Status card -------
  clearStatus(): void {
    this.statusType = '';
    this.statusTitle = '';
    this.statusMsg = '';
  }

  setStatus(type: StatusType, title: string, msg: string): void {
    this.statusType = type;
    this.statusTitle = title;
    this.statusMsg = msg;
  }

  closeStatus(): void {
    this.clearStatus();
  }
}
