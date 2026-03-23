import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { UserProfileService } from '../services/user-profile';
import { AuthService } from '../auth/auth.service';
import { SiteFooterComponent } from '../site-footer/footer';

type StatusType = 'success' | 'warning' | 'error' | '';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SiteFooterComponent],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css']
})
export class UserPageComponent implements OnInit {
  loading = false;

  profile: any = null;
  activity: any = { orders: [], balanceLogs: [] };

  editMode = false;
  addAmount = '';

  pendingQr: { id: string; code: string; qrCodeUrl: string } | null = null;

  // Betrag lokal merken, damit er immer direkt über dem QR angezeigt wird
  pendingAmount: number | null = null;

  flushQr: { id: string; code: string; qrCodeUrl: string } | null = null;

  classEditMode = false;
  classValue = '';

  // Klasse: leer erlaubt ODER 1. Zeichen Zahl, danach max. 4 weitere Zeichen (insg. max 5)
  private readonly CLASS_REGEX = /^(?:|[0-9][A-Za-z0-9]{0,4})$/;

  pwModalOpen = false;
  pwOld = '';
  pwNew = '';
  pwNew2 = '';
  pwSaving = false;

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
        this.classValue = String(this.profile?.user?.class ?? '').trim();

        this.api.getActivity().subscribe({
          next: (a) => {
            this.activity = a ?? { orders: [], balanceLogs: [] };
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

  money(n: any): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0,00 €';
    return v.toFixed(2).replace('.', ',') + ' €';
  }

  canDeleteAccount(): boolean {
    const balance = Number(this.profile?.balance ?? 0);
    const reserved = Number(this.profile?.reserved ?? 0);
    return balance === 0 && reserved === 0;
  }

  private parseMoneyToNumber(input: any): number {
    const raw = String(input ?? '').trim();
    if (!raw) return NaN;

    let normalized = raw.replace(/\s/g, '');

    const hasDot = normalized.includes('.');
    const hasComma = normalized.includes(',');

    if (hasDot && hasComma) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      normalized = normalized.replace(',', '.');
    }

    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }

  startEdit(): void {
    this.editMode = true;
    this.addAmount = '';
    this.pendingQr = null;
    this.pendingAmount = null;
    this.flushQr = null;
    this.clearStatus();
  }

  cancelEdit(): void {
    this.editMode = false;
    this.addAmount = '';
    this.pendingQr = null;
    this.pendingAmount = null;
  }

  saveAddRequest(): void {
    this.clearStatus();

    const delta = this.parseMoneyToNumber(this.addAmount);

    if (!Number.isFinite(delta) || delta <= 0) {
      this.setStatus('warning', 'Ungültiger Betrag', 'Bitte einen positiven Betrag eingeben.');
      return;
    }

    this.loading = true;
    this.api.createAddRequest(delta).subscribe({
      next: (res) => {
        this.loading = false;

        this.pendingQr = res;
        this.pendingAmount = delta; // Betrag direkt über dem QR anzeigen

        this.flushQr = null;

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

  requestFlush(): void {
    this.clearStatus();

    this.pendingQr = null;
    this.pendingAmount = null;
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

  deleteAccount(): void {
    this.clearStatus();
    if (!this.canDeleteAccount()) {
      this.setStatus('warning', 'Löschen nicht möglich', 'Guthaben muss 0 sein und es dürfen keine offenen Bestellungen existieren.');
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

  isClassValid(value: any): boolean {
    const v = String(value ?? '').trim();
    return this.CLASS_REGEX.test(v);
  }

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

    // leer ist erlaubt
    if (!this.isClassValid(cls)) {
      this.setStatus(
        'warning',
        'Ungültige Klasse',
        'Erlaubt sind maximal 5 Zeichen. Wenn ausgefüllt, muss das 1. Zeichen eine Zahl sein (z.B. 3A, 1BHIT).'
      );
      return;
    }

    this.loading = true;
    this.clearStatus();

    this.api.updateMyClass(cls)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.profile.user.class = cls;
          this.profile.user.blocked = false;

          const current = this.auth.getCurrentUser();
          if (current) {
            this.auth.setCurrentUser({ ...(current as any), class: cls, blocked: false } as any);
          }

          this.classEditMode = false;
          this.setStatus('success', 'Klasse aktualisiert', 'Dein Account wurde wieder freigeschaltet.');
          this.refreshAll();
        },
        error: (err) => {
          this.setStatus('error', 'Klasse konnte nicht gespeichert werden', err?.error?.message || err?.message || String(err));
        }
      });
  }

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

  formatOrderStatus(s: any): string {
    const v = String(s ?? '').toLowerCase();
    if (v === 'open') return 'Offen';
    if (v === 'closed') return 'Abgeschlossen';
    return v || '—';
  }

  formatIso(iso: any): string {
    const d = new Date(String(iso ?? ''));
    if (isNaN(d.getTime())) return String(iso ?? '');
    return d.toLocaleString('de-AT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  getOrderTitle(o: any): string {
    const items = Array.isArray(o?.items) ? o.items : [];
    if (!items.length) return `Bestellung #${o?.id ?? ''}`.trim();

    const parts = items.slice(0, 2).map((it: any) =>
      `${Number(it?.quantity ?? 0)}× ${it?.menuItem?.name ?? 'Artikel'}`
    );

    const rest = items.length - parts.length;
    return rest > 0 ? `${parts.join(', ')} (+${rest} weitere)` : parts.join(', ');
  }

  goToProfile(): void {
  this.router.navigate(['/me']);
}

  formatReason(code: any): string {
    const c = String(code ?? '').trim();
    const map: Record<string, string> = {
      BALANCE_ADD_CONFIRMED: 'Guthaben hinzugefügt (QR bestätigt)',
      BALANCE_FLUSH_CONFIRMED: 'Guthaben ausgeleert (QR bestätigt)',
      BALANCE_DELTA_DIRECT: 'Guthaben geändert (System/Admin)',
    };
    return map[c] ?? c ?? 'Änderung';
  }
}