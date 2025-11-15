import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-menu.html',
  styleUrls: ['./app-menu.css']
})
export class AppHeaderComponent {
  mobileOpen = false;
  isMobile = false;
  currentRoute: string = '';

  customerLinks: NavLink[] = [
    { label: 'Menüplan', route: '/' },
    { label: 'Warenkorb', route: '/warenkorb' },
    { label: 'Meine Bestellungen', route: '/my-orders' }
  ];

  ownerLinks: NavLink[] = [
    { label: 'Bestellübersicht', route: '/orders' },
    { label: 'Statistiken', route: '/statistics' },
    { label: 'Benutzerverwaltung', route: '/user' },
    { label: 'Menü-Manager', route: '/menu-manager' },
    { label: 'Menüplaner', route: '/menuplaner' },
    { label: 'Gerichte', route: '/gericht-verwaltung' }
  ];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
    
    // Track mobile state on window resize
    this.updateMobileState();
    window.addEventListener('resize', () => this.updateMobileState());
  }

  updateMobileState() {
    this.isMobile = window.innerWidth <= 900;
  }

  getCurrentPageTitle(): string {
    const allLinks = [...this.customerLinks, ...this.ownerLinks];
    const currentLink = allLinks.find(link => link.route === this.currentRoute);
    return currentLink ? currentLink.label : 'Mensa Bestellsystem';
  }

  getShortLabel(label: string): string {
    const shortLabels: { [key: string]: string } = {
      'Bestellübersicht': 'Bestellungen',
      'Benutzerverwaltung': 'Benutzer',
      'Menü-Manager': 'Menüs',
      'Menüplaner': 'Planer',
      'Gerichte': 'Gerichte',
      'Statistiken': 'Statistiken'
    };
    return shortLabels[label] || label;
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
  }

  getGuthaben(): number {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.balance || 0;
    } 
    return 0;
  }

  closeMobile() {
    this.mobileOpen = false;
    document.body.style.overflow = '';
  }
}
