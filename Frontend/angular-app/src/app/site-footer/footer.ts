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

  @Output() checkoutClick = new EventEmitter<void>();
  @Output() topupClick = new EventEmitter<void>();

  onCheckout(): void {
    if (this.cartCount <= 0) {
      return;
    }
    this.checkoutClick.emit();
  }

  onTopup(): void {
    this.topupClick.emit();
  }
}