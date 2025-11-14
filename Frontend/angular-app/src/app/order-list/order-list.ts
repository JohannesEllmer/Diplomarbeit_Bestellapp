import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderItem } from '../../models/menu-item.model';
import { OrderService } from '../services/order/order-service';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

type Camera = { id: string; label?: string };
type Res = { w: number; h: number };

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrls: ['./order-list.css']
})
export class OrderListComponent implements OnInit, OnDestroy {
  activeGroup: string = 'Keine Gruppierung';
  readonly groupOptions = ['Keine Gruppierung', 'Nach Gericht', 'Nach Lieferzeit'];

  orderItems: OrderItem[] = [];
  paginatedItems: OrderItem[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  pages: number[] = [];
  completedItems: OrderItem[] = [];
  completedCollapsed = true;

  scanning = false;
  private html5?: Html5Qrcode;
  cameras: Camera[] = [];
  selectedCameraId: string | null = null;
  resolution: Res = { w: 640, h: 480 };
  scanMessage = '';
  private pendingItem?: OrderItem;
  private scanningInProgress = false;

  constructor(private router: Router, private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.stopScanner().catch(() => {});
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe(items => {
      const all = items ?? [];

      this.orderItems = all.filter(i => !i.delivered);
      this.completedItems = all.filter(i => i.delivered);

      this.currentPage = 1;
      this.updatePagination();
    });
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedItems = this.orderItems.slice(start, end);
    this.updatePages();
  }

  updatePages(): void {
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  changeItemsPerPage(count: number): void {
    this.itemsPerPage = count;
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalPages(): number {
    return this.orderItems.length === 0
      ? 1
      : Math.ceil(this.orderItems.length / this.itemsPerPage);
  }

  get totalSum(): number {
    return this.orderItems.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  get groupedOrders(): { [key: string]: OrderItem[] } {
    switch (this.activeGroup) {
      case 'Nach Gericht':
        return this.groupBy(item => `${item.menuItem.name}`);
      case 'Nach Lieferzeit':
        return this.groupBy(item => item.deliveryTime || 'Unbekannt');
      default:
        return { 'Alle Bestellungen': this.paginatedItems };
    }
  }

  groupBy(fn: (item: OrderItem) => string): { [key: string]: OrderItem[] } {
    return this.paginatedItems.reduce((groups, item) => {
      const key = fn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: OrderItem[] });
  }

  toggleCompletedOrders(): void {
    this.completedCollapsed = !this.completedCollapsed;
  }

  async openScanner(item: OrderItem): Promise<void> {
    this.pendingItem = item;
    this.scanning = true;
    this.scanMessage = 'Kamera wird initialisiert …';

    try {
      await this.initCameras();
      await this.startScanner();
      this.scanMessage = 'Halte den QR-Code vor die Kamera.';
    } catch (err: any) {
      this.scanMessage = 'Kamera konnte nicht gestartet werden: ' + (err?.message || err);
    }
  }

  async closeScanner(): Promise<void> {
    await this.stopScanner();
    this.scanning = false;
    this.pendingItem = undefined;
    this.scanMessage = '';
  }

  private async initCameras(): Promise<void> {
    const devices = await Html5Qrcode.getCameras();
    this.cameras = (devices || []).map(d => ({ id: d.id, label: d.label }));
    if (!this.cameras.length) throw new Error('Keine Kamera gefunden.');
    if (!this.selectedCameraId) {
      const back = this.cameras.find(c => (c.label || '').toLowerCase().includes('back'));
      this.selectedCameraId = (back || this.cameras[0]).id;
    }
  }

  async startScanner(): Promise<void> {
    if (this.scanningInProgress) return;
    this.scanningInProgress = true;

    const elementId = 'qr-reader';
    if (this.html5?.isScanning) {
      await this.stopScanner();
    }
    this.html5 = new Html5Qrcode(elementId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    });

    await this.html5.start(
      { deviceId: { exact: this.selectedCameraId! } },
      {
        fps: 10,
        qrbox: (vw: number, vh: number) => {
          const minEdge = Math.min(vw, vh);
          const boxSize = Math.floor(minEdge * 0.6);
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: this.resolution.w / this.resolution.h
      },
      decodedText => this.onScanSuccess(decodedText),
      errorMessage => this.onScanError(errorMessage)
    );

    this.scanningInProgress = false;
  }

  private async stopScanner(): Promise<void> {
    if (this.html5) {
      try {
        if (this.html5.isScanning) {
          await this.html5.stop();
        }
        await this.html5.clear();
      } catch {}
      this.html5 = undefined;
    }
  }

  async switchCamera(): Promise<void> {
    if (this.html5) {
      this.scanMessage = 'Wechsle Kamera …';
      await this.restartScanner();
    }
  }

  async restartScanner(): Promise<void> {
    await this.stopScanner();
    await this.startScanner();
  }

  private onScanSuccess(decodedText: string): void {
    try {
      navigator.vibrate?.(50);
    } catch {}

    const code = decodedText?.trim();
    if (!code) return;

    const item = this.pendingItem;
    if (!item) return;

    this.scanMessage = 'Code erkannt. Bestellung wird abgeschlossen …';
    this.orderService.completeOrder(item.menuItem.id, code).subscribe({
      next: async () => {
        this.orderItems = this.orderItems.filter(i => i !== item);

        item.delivered = true;
        this.completedItems = [...this.completedItems, item];

        this.updatePagination();
        await this.closeScanner();
        alert('Bestellung erfolgreich abgeschlossen!');
      },
      error: async (err) => {
        await this.closeScanner();
        this.scanMessage = 'Fehler beim Abschließen: ' + (err?.message || err);
        alert('Fehler beim Abschließen: ' + (err?.message || err));
      }
    });
  }

  private onScanError(_msg: string): void {
  }

  navigateToUser(userId: string): void {
    this.router.navigate(['/user', userId]).catch(() => {
      this.router.navigate(['/user']);
    });
  }

  goToFinance(): void {
    this.router.navigate(['/statistics']);
  }
}