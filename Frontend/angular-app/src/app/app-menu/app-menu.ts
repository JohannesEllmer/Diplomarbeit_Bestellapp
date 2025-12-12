// app-menu.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';

interface NavLink {
  label: string;
  route: string;
  roles: string[]; // Welche Rollen diesen Link sehen dürfen
  section: 'customer' | 'management'; // Zu welcher Sektion der Link gehört
  shortLabel?: string; // Optional: Kurzlabel für Desktop
}

interface UserRoleConfig {
  name: string;
  label: string;
  color: string;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-menu.html',
  styleUrls: ['./app-menu.css']
})
export class AppMenuComponent implements OnInit, OnDestroy {
  mobileOpen = false;
  isMobile = false;
  currentRoute = '';
  private routerSubscription!: Subscription;

  // Rollenkonfiguration
  readonly ROLES: { [key: string]: UserRoleConfig } = {
    ADMIN: { name: 'ADMIN', label: 'Administrator', color: '#ef4444' },
    INHABER: { name: 'INHABER', label: 'Verwaltung', color: '#3b82f6' },
    KUNDE: { name: 'KUNDE', label: 'Kunde', color: '#10b981' }
  };

  // Zentrale Menükonfiguration
  readonly NAV_CONFIG: NavLink[] = [
    // Kundenbereich
    { label: 'Menüplan', route: '/', roles: ['KUNDE', 'INHABER', 'ADMIN'], section: 'customer' },
    { label: 'Warenkorb', route: '/warenkorb', roles: ['KUNDE', 'INHABER', 'ADMIN'], section: 'customer' },
    { label: 'Meine Bestellungen', route: '/my-orders', roles: ['KUNDE', 'INHABER', 'ADMIN'], section: 'customer' },

    // Verwaltungsbereich
    { label: 'Bestellübersicht', route: '/orders', roles: ['INHABER', 'ADMIN'], section: 'management', shortLabel: 'Bestellungen' },
    { label: 'Statistiken', route: '/statistics', roles: ['INHABER', 'ADMIN'], section: 'management' },
    { label: 'Benutzerverwaltung', route: '/user', roles: ['ADMIN'], section: 'management', shortLabel: 'Benutzer' },
    { label: 'Menü-Manager', route: '/menu-manager', roles: ['INHABER', 'ADMIN'], section: 'management', shortLabel: 'Menüs' },
    { label: 'Menüplaner', route: '/menuplaner', roles: ['INHABER', 'ADMIN'], section: 'management', shortLabel: 'Planer' },
    { label: 'Gerichte', route: '/gericht-verwaltung', roles: ['INHABER', 'ADMIN'], section: 'management' }
  ];

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
        this.closeMobile();
      });

    this.updateMobileState();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // ---------- User Management ----------

  get currentUser(): any | null {
    // nutzt jetzt zentral den AuthService
    return this.auth.getCurrentUser();
  }

  get currentRole(): string | null {
    return this.currentUser?.role ?? null;
  }

  get userRoleConfig(): UserRoleConfig | null {
    const role = this.currentRole;
    return role ? this.ROLES[role] || { name: role, label: role, color: '#6b7280' } : null;
  }

  get hasUser(): boolean {
    return !!this.currentUser;
  }

  get userName(): string {
    const user = this.currentUser;
    if (!user) return '';
    return user.name || user.email || '';
  }

  get userInitials(): string {
    const user = this.currentUser;
    if (!user) return '';
    const name: string = user.name || user.email || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
  }

  get userBalance(): number {
    const user = this.currentUser;
    return user?.balance || 0;
  }

  logout(): void {
    this.auth.logout();
    this.closeMobile();
  }

  // ---------- Rollenprüfung ----------
  hasAnyRole(roles: string[]): boolean {
    const currentRole = this.currentRole;
    return currentRole ? roles.includes(currentRole) : false;
  }

  // ---------- Navigation Links ----------
  getNavLinks(section: 'customer' | 'management'): NavLink[] {
    const currentRole = this.currentRole;
    if (!currentRole) return [];
    return this.NAV_CONFIG.filter(
      link => link.section === section && link.roles.includes(currentRole)
    );
  }

  getCustomerLinks(): NavLink[] {
    return this.getNavLinks('customer');
  }

  getManagementLinks(): NavLink[] {
    return this.getNavLinks('management');
  }

  getDisplayLabel(link: NavLink): string {
    if (this.isMobile) return link.label;
    return link.shortLabel || link.label;
  }

  // ---------- Mobile Handling ----------
  @HostListener('window:resize')
  onResize(): void {
    this.updateMobileState();
  }

  updateMobileState(): void {
    this.isMobile = window.innerWidth <= 900;
    if (!this.isMobile) {
      this.closeMobile();
    }
  }

  getCurrentPageTitle(): string {
    const currentLink = this.NAV_CONFIG.find(link => link.route === this.currentRoute);
    return currentLink ? currentLink.label : 'HungerSatt Bestellsystem';
  }

  toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
    document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
  }

  closeMobile(): void {
    this.mobileOpen = false;
    document.body.style.overflow = '';
  }

  // ---------- Hilfsmethoden ----------
  formatBalance(): string {
    return this.userBalance.toFixed(2);
  }

  getRoleColor(): string {
    return this.userRoleConfig?.color || '#6b7280';
  }
}
