import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription, interval } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { MenuHeaderService } from './menu-header.service';
import { MenuHeaderDto } from './menu-header.dto';
import { MenuHeader } from './menu-header.model';
interface NavLink {
  label: string;
  route: string;
  roles: string[];
  section: 'customer' | 'management';
  shortLabel?: string;
}

interface UserRoleConfig {
  name: string;
  label: string;
  color: string;
}

type AdminView = 'USER' | 'MANAGEMENT';

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

  userMenuOpen = false;

  adminView: AdminView =
    (localStorage.getItem('admin_view') as AdminView) || 'USER';

  header: MenuHeaderDto | null = null;
  private headerSub?: Subscription;
  private headerRefreshSub?: Subscription;

  readonly ROLES: { [key: string]: UserRoleConfig } = {
    ADMIN: { name: 'ADMIN', label: 'Administrator', color: '#ef4444' },
    INHABER: { name: 'INHABER', label: 'Verwaltung', color: '#3b82f6' },
    KUNDE: { name: 'KUNDE', label: 'Kunde', color: '#10b981' }
  };

  readonly NAV_CONFIG: NavLink[] = [
    // Kundenbereich
    {
      label: 'Menüplan',
      route: '/',
      roles: ['KUNDE', 'INHABER', 'ADMIN'],
      section: 'customer'
    },
    {
      label: 'Warenkorb',
      route: '/warenkorb',
      roles: ['KUNDE', 'INHABER', 'ADMIN'],
      section: 'customer'
    },
    {
      label: 'Meine Bestellungen',
      route: '/my-orders',
      roles: ['KUNDE', 'INHABER', 'ADMIN'],
      section: 'customer'
    },
    {
      label: 'Mein Profil',
      route: '/me',
      roles: ['KUNDE', 'INHABER', 'ADMIN'],
      section: 'customer'
    },

    {
      label: 'Benachrichtigungen',
      route: '/benachrichtigungen',
      roles: ['KUNDE', 'INHABER', 'ADMIN'],
      section: 'customer',
      shortLabel: 'Hinweise'
    },

    {
      label: 'Bestellübersicht',
      route: '/orders',
      roles: ['INHABER', 'ADMIN'],
      section: 'management',
      shortLabel: 'Bestellungen'
    },
    {
      label: 'Statistiken',
      route: '/statistics',
      roles: ['INHABER', 'ADMIN'],
      section: 'management'
    },
    {
      label: 'Benutzerverwaltung',
      route: '/user',
      roles: ['ADMIN', 'INHABER'],
      section: 'management',
      shortLabel: 'Benutzer'
    },
    {
      label: 'QR Code Scanner',
      route: '/admin/balance-scan',
      roles: ['INHABER', 'ADMIN'],
      section: 'management'
    },

    {
      label: 'Hinweise heute',
      route: '/benachrichtigungen-heute',
      roles: ['INHABER', 'ADMIN'],
      section: 'management',
      shortLabel: 'Heute'
    },

    {
      label: 'Menü-Manager',
      route: '/menu-manager',
      roles: ['INHABER', 'ADMIN'],
      section: 'management',
      shortLabel: 'Menüs'
    },
    {
      label: 'Menüplaner',
      route: '/menuplaner',
      roles: ['INHABER', 'ADMIN'],
      section: 'management',
      shortLabel: 'Planer'
    },
    {
      label: 'Gerichte',
      route: '/gericht-verwaltung',
      roles: ['INHABER', 'ADMIN'],
      section: 'management'
    }
  ];

  private onDocClickBound = (ev: MouseEvent) => this.onDocumentClick(ev);

  constructor(
    private router: Router,
    private auth: AuthService,
    private headerService: MenuHeaderService,
    // private notifications: NotificationService, // optional
  ) {}

  ngOnInit(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = (event.urlAfterRedirects || event.url || '') as string;

        this.currentRoute = url.split('?')[0].split('#')[0];

        this.closeMobile();
        this.closeUserMenu();

        if (this.auth.isLoggedIn()) {
          this.headerService.refresh();

        } else {
          this.header = null;
        }
      });

    this.updateMobileState();
    document.addEventListener('click', this.onDocClickBound, true);

    this.headerSub = this.headerService
      .watchHeader()
      .subscribe((h: MenuHeader | null) => {
        this.header = h as MenuHeaderDto;
      });

    if (this.auth.isLoggedIn()) {
      this.headerService.refresh();
    } else {
      this.header = null;
    }

    this.headerRefreshSub = interval(30000).subscribe(() => {
      if (this.auth.isLoggedIn()) {
        this.headerService.refresh();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.headerSub?.unsubscribe();
    this.headerRefreshSub?.unsubscribe();
    document.removeEventListener('click', this.onDocClickBound, true);
  }

  // ---------- User Management ----------
  get currentUser(): any | null {
    return this.auth.getCurrentUser();
  }

  get currentRole(): string | null {
    return this.currentUser?.role ?? null;
  }

  get effectiveRole(): string | null {
    const role = this.currentRole;
    if (role !== 'ADMIN') return role;
    return this.adminView === 'USER' ? 'KUNDE' : 'INHABER';
  }

  get userRoleConfig(): UserRoleConfig | null {
    const role = this.effectiveRole;
    return role
      ? this.ROLES[role] || { name: role, label: role, color: '#6b7280' }
      : null;
  }

  get hasUser(): boolean {
    return !!this.currentUser;
  }

  get userName(): string {
    if (this.header?.name) return this.header.name;
    const user = this.currentUser;
    if (!user) return '';
    return user.name || user.email || '';
  }

  get userInitials(): string {
    const name: string = this.userName || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
  }

  get userBalance(): number {
    const h = this.header?.balance;
    if (typeof h === 'number' && Number.isFinite(h)) return h;

    const cu = this.currentUser?.balance;
    const n = Number(cu ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  formatBalance(): string {
    const n = Number(this.userBalance);
    return Number.isFinite(n) ? n.toFixed(2) : '0.00';
  }

  logout(): void {
    this.closeUserMenu();
    this.closeMobile();

    this.auth.logout();

    if (typeof (this.headerService as any).clear === 'function') {
      (this.headerService as any).clear();
    } else {
      this.header = null;
    }
  }

  // ---------- Admin View ----------
  setAdminView(view: AdminView): void {
    this.adminView = view;
    localStorage.setItem('admin_view', view);
  }

  getEffectiveRoleLabel(): string {
    if (this.currentRole !== 'ADMIN') {
      return this.userRoleConfig?.label ?? '';
    }
    return this.adminView === 'USER' ? 'Admin – User' : 'Admin – Management';
  }

  // ---------- Rollenprüfung ----------
  hasAnyRole(roles: string[]): boolean {
    const role = this.effectiveRole;
    return role ? roles.includes(role) : false;
  }

  // ---------- Navigation Links ----------
  getNavLinks(section: 'customer' | 'management'): NavLink[] {
    const role = this.effectiveRole;
    if (!role) return [];
    return this.NAV_CONFIG.filter(
      link => link.section === section && link.roles.includes(role)
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

  private isActiveRoute(route: string): boolean {
    if (route === '/') return this.currentRoute === '/';
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  getCurrentPageTitle(): string {
    const candidates = this.NAV_CONFIG
      .filter(l => this.isActiveRoute(l.route))
      .sort((a, b) => b.route.length - a.route.length);

    return candidates.length ? candidates[0].label : 'HungerSatt Bestellsystem';
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
    } else {
      this.closeUserMenu();
    }
  }

  toggleMobile(): void {
    this.mobileOpen = !this.mobileOpen;
    document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
    this.closeUserMenu();
  }

  closeMobile(): void {
    this.mobileOpen = false;
    document.body.style.overflow = '';
  }

  getRoleColor(): string {
    return this.userRoleConfig?.color || '#6b7280';
  }

  // ---------- Desktop Dropdown ----------
  toggleUserMenu(ev?: MouseEvent): void {
    if (ev) ev.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  private onDocumentClick(ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    if (!target.closest('.desktop-user-wrapper')) {
      this.closeUserMenu();
    }
  }

  goToChangePassword(): void {
    this.closeUserMenu();
    this.closeMobile();
    this.router.navigate(['/change-password']);
  }
}
