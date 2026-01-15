import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { finalize } from 'rxjs/operators';

import { AdminBalanceService } from '../services/admin-balance';
import { AdminOrderService } from '../services/order/admin-order.service';

type ScanResult = {
  ok: boolean;
  userId?: string;
  delta?: number;
  balanceAfter?: number;
  alreadyUsed?: boolean;
};

// ✅ für Order-Scan Ergebnis (minimal, weil Backend-Response bei dir { ok, order? } ist)
type OrderScanResult = {
  ok: boolean;
  order?: any;
};

type CameraInfo = { id: string; label: string };

type ScanType = 'balance' | 'order' | 'unknown';

type HistoryItem = {
  at: number;
  code: string;
  type: ScanType;
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

  // ✅ optional: letztes Order-Ergebnis
  lastOrderResult: OrderScanResult | null = null;

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

  constructor(
    private api: AdminBalanceService,
    private adminOrders: AdminOrderService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCamerasSafe();
    this.restoreCamera();
  }

  ngOnDestroy(): void {
    this.stopScanner().catch(() => {});
  }

  async start(): Promise<void> {
    if (this.scanning || this.scanningInProgress) return;

    this.scanning = true;
    this.message = 'Kamera wird initialisiert …';
    this.lastResult = null;
    this.lastOrderResult = null;

    try {
      await this.loadCamerasSafe(true);
      this.pickDefaultCameraIfMissing();
      await this.startScanner();
      this.message = 'Halte einen QR-Code (Guthaben oder Order) vor die Kamera.';
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
      this.message = 'Halte einen QR-Code (Guthaben oder Order) vor die Kamera.';
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
  // Scan type detection
  // -----------------------------
  private detectType(code: string): ScanType {
    const c = (code || '').trim();

    // ✅ Guthaben: BalanceReq-UUID
    if (/^BalanceReq-[0-9a-fA-F-]{36}$/.test(c)) return 'balance';

    // ✅ Order: Order-<irgendwas>
    if (/^Order-.+$/i.test(c)) return 'order';

    return 'unknown';
  }

  // -----------------------------
  // Scan handling
  // -----------------------------
  private onScanSuccess(decodedText: string, fromManual: boolean): void {
    const code = (decodedText || '').trim();
    if (!code) return;

    // schnelle UI Rückmeldung
    if (!fromManual) this.manualCode = code;

    const type = this.detectType(code);

    if (type === 'unknown') {
      this.message = 'Unbekannter QR-Code.';
      this.pushHistory({
        at: Date.now(),
        code,
        type,
        ok: false,
        msg: 'Unbekanntes Format'
      });
      return;
    }

    // Debounce: gleiche Codes nicht dauernd bestätigen (gilt für beide Typen)
    const now = Date.now();
    if (this.confirmInFlight) return;

    if (code === this.lastConfirmedCode && now - this.lastConfirmedAt < 2000) {
      return;
    }

    this.confirmInFlight = true;
    this.lastConfirmedCode = code;
    this.lastConfirmedAt = now;

    // optional: Scanner "pausieren", damit es nicht mehrfach feuert
    const h: any = this.html5 as any;
    h?.pause?.(true);

    if (type === 'balance') {
      this.handleBalance(code, h);
      return;
    }

    // type === 'order'
    this.handleOrder(code, h);
  }

  private handleBalance(code: string, h: any): void {
    this.message = 'Guthaben-QR erkannt. Bestätigung läuft …';

    this.api
      .confirm(code)
      .pipe(finalize(() => (this.confirmInFlight = false)))
      .subscribe({
        next: (res) => {
          this.lastResult = res ?? { ok: false };
          this.lastOrderResult = null;

          if (this.lastResult?.ok) {
            const used = !!this.lastResult.alreadyUsed;
            this.message = used ? 'OK (bereits verwendet).' : 'OK. Guthaben geändert.';

            this.pushHistory({
              at: Date.now(),
              code,
              type: 'balance',
              ok: true,
              alreadyUsed: used,
              userId: this.lastResult.userId,
              delta: this.lastResult.delta,
              balanceAfter: this.lastResult.balanceAfter,
              msg: used ? 'OK (already used)' : 'OK'
            });

            this.onSuccessFeedback();

            if (this.autoStopOnSuccess && !used) {
              this.stop().catch(() => {});
              return;
            }
          } else {
            this.message = 'Bestätigung fehlgeschlagen.';
            this.pushHistory({
              at: Date.now(),
              code,
              type: 'balance',
              ok: false,
              msg: 'Backend: ok=false'
            });
          }

          h?.resume?.();
        },
        error: (err) => {
          this.lastResult = { ok: false };
          this.lastOrderResult = null;

          const msg = err?.error?.message || err?.message || String(err);
          this.message = 'Fehler: ' + msg;

          this.pushHistory({
            at: Date.now(),
            code,
            type: 'balance',
            ok: false,
            msg: 'Fehler: ' + msg
          });

          this.confirmInFlight = false;
          h?.resume?.();
        }
      });
  }

  private handleOrder(code: string, h: any): void {
    this.message = 'Order-QR erkannt. Bestellung wird abgeschlossen …';

    // ✅ sendet GENAU das gleiche wie vorher an dein Backend: { code }
    this.adminOrders
      .completeByQrCode(code)
      .pipe(finalize(() => (this.confirmInFlight = false)))
      .subscribe({
        next: (res) => {
          this.lastOrderResult = res ?? { ok: false };
          this.lastResult = null;

          if (this.lastOrderResult?.ok) {
            this.message = 'OK. Bestellung abgeschlossen.';

            this.pushHistory({
              at: Date.now(),
              code,
              type: 'order',
              ok: true,
              msg: 'Order abgeschlossen'
            });

            this.onSuccessFeedback();

            // analog zu Guthaben: bei Erfolg ggf. stoppen
            if (this.autoStopOnSuccess) {
              this.stop().catch(() => {});
              return;
            }
          } else {
            this.message = 'Abschluss fehlgeschlagen.';
            this.pushHistory({
              at: Date.now(),
              code,
              type: 'order',
              ok: false,
              msg: 'Backend: ok=false'
            });
          }

          h?.resume?.();
        },
        error: (err) => {
          this.lastOrderResult = { ok: false };
          this.lastResult = null;

          const msg = err?.error?.message || err?.message || String(err);
          this.message = 'Fehler: ' + msg;

          this.pushHistory({
            at: Date.now(),
            code,
            type: 'order',
            ok: false,
            msg: 'Fehler: ' + msg
          });

          this.confirmInFlight = false;
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
