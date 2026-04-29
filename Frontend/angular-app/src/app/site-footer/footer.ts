import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class SiteFooterComponent {
  @Input() availableBalance = 0;
  @Input() totalAmount = 0;
  @Input() cartCount = 0;

  @Input() showCheckout = true;
  @Input() showTopup = false;
  @Input() showImpressum = false;

  @Input() showBalance = false;
  @Input() showTotal = false;

  @Input() checkoutLabel = 'Bestellen';
  @Input() topupLabel = 'Guthaben aufladen';

  @Output() checkoutClick = new EventEmitter<void>();
  @Output() topupClick = new EventEmitter<void>();
  @Output() impressumClick = new EventEmitter<void>();

  onCheckout(): void {
    if (this.cartCount <= 0) return;
    this.checkoutClick.emit();
  }

  onTopup(): void {
    this.topupClick.emit();
  }

  onImpressum(): void {
    this.impressumClick.emit();
  }

  get showMainRow(): boolean {
    return this.showBalance || this.showTotal || this.showCheckout;
  }
}