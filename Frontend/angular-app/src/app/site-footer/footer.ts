import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css'],
})
export class SiteFooterComponent {
  @Input() companyName = 'HungerSatt Schulbistro';
  @Input() inhaber = 'Markus Gruber';
  @Input() address = 'Alte Bundesstraße 11, 5600 St. Johann';
  @Input() uid = 'UID: 68016602';
  @Input() email = 'mahlzeit.hungersatt@gmail.com';
}