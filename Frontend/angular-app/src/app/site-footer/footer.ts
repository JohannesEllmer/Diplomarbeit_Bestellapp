import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class SiteFooterComponent {
  @Input() companyName = 'HungerSatt Schulbistro';
  @Input() inhaber = 'Inhaber Markus Gruber';
  @Input() address = 'Alte Bundestraße 11 - 5600 St. Johann';
  @Input() uid = 'UID: 68016602';

  @Input() showImpressumPopup = false;
  @Output() showImpressumPopupChange = new EventEmitter<boolean>();

  openImpressum(): void {
    this.setImpressum(true);
  }

  closeImpressum(): void {
    this.setImpressum(false);
  }


  private setImpressum(next: boolean): void {
    this.showImpressumPopup = next;
    this.showImpressumPopupChange.emit(next);
  }
}
