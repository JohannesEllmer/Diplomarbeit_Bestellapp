import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { finalize } from 'rxjs/operators';

import { AdminBalanceService } from '../services/admin-balance';

type ScanResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  balanceAfter?: number;
  alreadyUsed?: boolean;
};

type CameraInfo = { id: string; label: string };

type HistoryItem = {
  at: number;
  code: string;
  ok: boolean;
  alreadyUsed?: boolean;
  userId?: string;
  delta?: number;
  balanceAfter?: number;
  msg: string;
};

@Component({
  selector: 'app-balance-scan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-balance.html',
  styleUrls: ['./admin-balance.css']
})
export class BalanceScanComponent implements OnInit, OnDestroy {
  scanning = false;
  message = '';
  lastResult: ScanResult | null = null;

  // UI / Features
  cameras: CameraInfo[] = [];
  selectedCameraId: string | null = null;

  autoStopOnSuccess = true;
  soundOnSuccess = true;
  vibrateOnSuccess = true;

  manualCode = '';

  history: HistoryItem[] = [];

  // internals
  private html5?: Html5Qrcode;
  private scanningInProgress = false;

  private confirmInFlight = false;
  private lastConfirmedCode = '';
  private lastConfirmedAt = 0;

  private readonly STORAGE_CAM = 'admin_balance_scan_camera';

  constructor(private api: AdminBalanceService) {}

  async ngOnInit(): Promise<void> {
    await this.loadCamerasSafe();
    this.restoreCamera();
  }

  ngOnDestroy(): void {
    this.stopScanner().catch(() => {});
  }

  // -----------------------------
  // UI Actions
  // -----------------------------
  async start(): Promise<void> {
    if (this.scanning || this.scanningInProgress) return;

    this.scanning = true;
    this.message = 'Kamera wird initialisiert …';
    this.lastResult = null;

    try {
      await this.loadCamerasSafe(true);
      this.pickDefaultCameraIfMissing();
      await this.startScanner();
      this.message = 'Halte den Guthaben-QR-Code vor die Kamera.';
    } catch (e: any) {
      this.message =
        'Kamera konnte nicht gestartet werden: ' + (e?.message || String(e));
      this.scanning = false;
    }
  }

  async stop(): Promise<void> {
    await this.stopScanner();
    this.scanning = false;
    this.message = '';
  }

  async changeCamera(id: string): Promise<void> {
    this.selectedCameraId = id || null;
    if (this.selectedCameraId) localStorage.setItem(this.STORAGE_CAM, this.selectedCameraId);

    // wenn schon am scannen -> sauber neu starten
    if (this.scanning) {
      this.message = 'Wechsle Kamera …';
      await this.stopScanner();
      await this.startScanner();
      this.message = 'Halte den Guthaben-QR-Code vor die Kamera.';
    }
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      const txt = await navigator.clipboard.readText();
      this.manualCode = (txt || '').trim();
      this.message = this.manualCode ? 'Code aus Zwischenablage eingefügt.' : 'Zwischenablage ist leer.';
    } catch {
      this.message = 'Zwischenablage nicht verfügbar (Browser/HTTPS).';
    }
  }

  submitManual(): void {
    const code = (this.manualCode || '').trim();
    if (!code) {
      this.message = 'Bitte einen Code einfügen.';
      return;
    }
    this.onScanSuccess(code, true);
  }

  clearHistory(): void {
    this.history = [];
    this.message = 'History geleert.';
  }

  copy(text: string): void {
    const v = (text || '').trim();
    if (!v) return;
    navigator.clipboard?.writeText(v).then(
      () => (this.message = 'Kopiert.'),
      () => (this.message = 'Kopieren nicht möglich.')
    );
  }

  // -----------------------------
  // Camera / Scanner setup
  // -----------------------------
  private async loadCamerasSafe(force = false): Promise<void> {
    if (!force && this.cameras.length) return;
    try {
      const devices = await Html5Qrcode.getCameras();
      this.cameras = (devices || []).map(d => ({
        id: d.id,
        label: (d.label || 'Kamera').trim() || 'Kamera'
      }));
    } catch (e) {
      // iOS / Safari: ohne HTTPS oder ohne Permission kann das failen
      this.cameras = [];
    }
  }

  private restoreCamera(): void {
    const saved = localStorage.getItem(this.STORAGE_CAM);
    if (saved) this.selectedCameraId = saved;
  }

  private pickDefaultCameraIfMissing(): void {
    if (this.selectedCameraId && this.cameras.some(c => c.id === this.selectedCameraId)) return;
    if (!this.cameras.length) return;

    // "back" bevorzugen, sonst erste
    const back = this.cameras.find(c => (c.label || '').toLowerCase().includes('back'));
    this.selectedCameraId = (back || this.cameras[0]).id;
    localStorage.setItem(this.STORAGE_CAM, this.selectedCameraId);
  }

  private async startScanner(): Promise<void> {
    if (this.scanningInProgress) return;
    this.scanningInProgress = true;

    try {
      const elementId = 'qr-reader';

      if (this.html5?.isScanning) {
        await this.stopScanner();
      }

      if (!this.selectedCameraId) {
        throw new Error('Keine Kamera ausgewählt.');
      }

      this.html5 = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });

      await this.html5.start(
        { deviceId: { exact: this.selectedCameraId } },
        {
          fps: 12,
          // QR-Box wird vom Video-Viewport abgeleitet (bei uns ist Container quadratisch)
          qrbox: (vw: number, vh: number) => {
            const minEdge = Math.min(vw, vh);
            const size = Math.floor(minEdge * 0.78);
            return { width: size, height: size };
          }
        },
        (decodedText) => this.onScanSuccess(decodedText, false),
        () => {}
      );
    } finally {
      this.scanningInProgress = false;
    }
  }

  private async stopScanner(): Promise<void> {
    this.scanningInProgress = false;
    if (!this.html5) return;

    try {
      if (this.html5.isScanning) await this.html5.stop();
      await this.html5.clear();
    } catch {}
    this.html5 = undefined;
  }

  // -----------------------------
  // Scan handling
  // -----------------------------
  private onScanSuccess(decodedText: string, fromManual: boolean): void {
    const code = (decodedText || '').trim();
    if (!code) return;

    // schnelle UI Rückmeldung
    if (!fromManual) this.manualCode = code;

    // Validierung
    if (!/^BalanceReq-[0-9a-fA-F-]{36}$/.test(code)) {
      this.message = 'Kein gültiger Guthaben-QR-Code.';
      this.pushHistory({
        at: Date.now(),
        code,
        ok: false,
        msg: 'Ungültiger Code (Format)'
      });
      return;
    }

    // Debounce: gleiche Codes nicht dauernd bestätigen
    const now = Date.now();
    if (this.confirmInFlight) return;

    if (code === this.lastConfirmedCode && now - this.lastConfirmedAt < 2000) {
      return;
    }

    this.confirmInFlight = true;
    this.lastConfirmedCode = code;
    this.lastConfirmedAt = now;

    this.message = 'QR erkannt. Bestätigung läuft …';

    // optional: Scanner "pausieren", damit es nicht mehrfach feuert
    const h: any = this.html5 as any;
    h?.pause?.(true);

    this.api
      .confirm(code)
      .pipe(finalize(() => (this.confirmInFlight = false)))
      .subscribe({
        next: (res) => {
          this.lastResult = res ?? { ok: false };

          if (this.lastResult?.ok) {
            const used = !!this.lastResult.alreadyUsed;
            this.message = used ? 'OK (bereits verwendet).' : 'OK. Guthaben geändert.';

            this.pushHistory({
              at: Date.now(),
              code,
              ok: true,
              alreadyUsed: used,
              userId: this.lastResult.userId,
              delta: this.lastResult.delta,
              balanceAfter: this.lastResult.balanceAfter,
              msg: used ? 'OK (already used)' : 'OK'
            });

            this.onSuccessFeedback();

            if (this.autoStopOnSuccess && !used) {
              // stoppt nach echtem Erfolg (optional auch bei alreadyUsed)
              this.stop().catch(() => {});
              return;
            }
          } else {
            this.message = 'Bestätigung fehlgeschlagen.';
            this.pushHistory({
              at: Date.now(),
              code,
              ok: false,
              msg: 'Backend: ok=false'
            });
          }

          // resume scanner
          h?.resume?.();
        },
        error: (err) => {
          this.lastResult = { ok: false };
          const msg = err?.error?.message || err?.message || String(err);
          this.message = 'Fehler: ' + msg;

          this.pushHistory({
            at: Date.now(),
            code,
            ok: false,
            msg: 'Fehler: ' + msg
          });

          h?.resume?.();
        }
      });
  }

  private onSuccessFeedback(): void {
    if (this.vibrateOnSuccess && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate?.([60, 40, 60]); } catch {}
    }

    if (this.soundOnSuccess) {
      try {
        // kleiner Beep via WebAudio (keine Datei nötig)
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          ctx.close().catch(() => {});
        }, 120);
      } catch {}
    }
  }

  private pushHistory(item: HistoryItem): void {
    this.history = [item, ...this.history].slice(0, 12);
  }

  // -----------------------------
  // Formatting
  // -----------------------------
  money(n: any): string {
    const v = Number(n ?? 0);
    const fixed = Number.isFinite(v) ? v.toFixed(2) : '0.00';
    return fixed.replace('.', ',') + ' €';
  }

  time(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
