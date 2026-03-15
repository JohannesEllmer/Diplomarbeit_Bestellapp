import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserItemsComponent } from '../user-items/user-items';
import { User } from '../../models/user.model';
import { UserService, PendingDeletionItem } from '../services/user/user-service';
import { SiteFooterComponent } from '../site-footer/footer';

type StatusType = 'success' | 'warning' | 'error' | '';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, UserItemsComponent, SiteFooterComponent],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  currentPage = 1;
  usersPerPage = 5;
  pages: number[] = [];
  searchTerm = '';
  showImpressumPopup = false;

  // ---- Datenschutz / Pending deletion UI ----
  pendingDeletions: PendingDeletionItem[] = [];

  purgeModalOpen = false;
  purgeTarget: PendingDeletionItem | null = null;
  purgeConfirmText = '';
  purgePreviewText = '';
  purgeSaving = false;

  statusType: StatusType = '';
  statusTitle = '';
  statusMsg = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingDeletions();
  }

  // ---------------------------
  // Users
  // ---------------------------
  loadUsers(): void {
    this.userService.getUsers().subscribe(users => {
      this.users = users ?? [];
      this.filterUsers();
    });
  }

  filterUsers(): void {
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        (user.name ?? '').toLowerCase().includes(searchLower)
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  onSearchChange(): void {
    this.filterUsers();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterUsers();
  }

  updatePagination(): void {
    const start = (this.currentPage - 1) * this.usersPerPage;
    const end = start + this.usersPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
    this.updatePages();
  }

  updatePages(): void {
    const total = this.totalPages;
    this.pages = Array.from({ length: total }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  changeUsersPerPage(count: number): void {
    this.usersPerPage = Number(count);
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.usersPerPage));
  }

  deleteUser(user: User): void {
    const bal = Number(user.balance ?? 0);
    if (bal !== 0) {
      alert(`Benutzer "${user.name}" kann nicht gelöscht werden, solange das Guthaben (${bal}) ungleich 0 ist.`);
      return;
    }

    const confirmed = confirm(`Benutzer "${user.name}" wirklich löschen?`);
    if (!confirmed) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.filterUsers();
      },
      error: (err) => {
        console.error(err);
        if (err?.message === 'NON_ZERO_BALANCE') {
          alert(`Benutzer "${user.name}" kann nur gelöscht werden, wenn das Guthaben 0 ist.`);
        } else {
          alert('Benutzer konnte nicht gelöscht werden.');
        }
      }
    });
  }

  onRoleChange(e: { user: User; role: string }): void {
    const { user, role } = e;

    const confirmed = confirm(`Rolle von "${user.name}" auf "${role}" ändern?`);
    if (!confirmed) return;

    this.userService.updateUserRole(user.id, role).subscribe({
      next: (updated) => {
        const idx = this.users.findIndex(u => u.id === updated.id);
        if (idx !== -1) this.users[idx] = updated;
        this.filterUsers();
      },
      error: (err) => {
        console.error(err);
        alert('Rolle konnte nicht geändert werden.');
      }
    });
  }

  resetPassword(user: User): void {
    const confirmed = confirm(`Passwort für "${user.name}" wirklich zurücksetzen?`);
    if (!confirmed) return;

    this.userService.resetPassword(user.id).subscribe({
      next: (newPassword) => {
        alert(`Neues Passwort für "${user.name}": ${newPassword}`);
      },
      error: (err) => {
        console.error(err);
        alert('Passwort konnte nicht zurückgesetzt werden.');
      }
    });
  }

  blockUser(user: User): void {
    this.userService.toggleBlockUser(user).subscribe(updated => {
      const index = this.users.findIndex(u => u.id === updated.id);
      if (index !== -1) this.users[index] = updated;
      this.filterUsers();

      // optional: nach Block/Unblock neu laden, falls disabledAt/Policy relevant
      this.loadPendingDeletions();
    });
  }

  // ---------------------------
  // Datenschutz: 3 Jahre deaktiviert → Löschpopup
  // ---------------------------
  loadPendingDeletions(): void {
    this.userService.getPendingDeletions().subscribe({
      next: (rows) => {
        this.pendingDeletions = (rows ?? []).slice();

        // automatisch Popup öffnen (ältester Eintrag), wenn vorhanden und kein Popup offen
        if (this.pendingDeletions.length && !this.purgeModalOpen) {
          this.openPurgeModal(this.pendingDeletions[0]);
        }
      },
      error: (err) => {
        console.error(err);
        // nicht hart nerven – nur dezent in status (optional)
        this.setStatus('warning', 'Hinweis', 'Löschwarnungen konnten nicht geladen werden.');
      }
    });
  }

  openPurgeModal(item: PendingDeletionItem): void {
    this.clearStatus();
    this.purgeModalOpen = true;
    this.purgeTarget = item;
    this.purgeConfirmText = '';
    this.purgePreviewText = 'Lade Details…';

    this.userService.purgePreview(item.userId).subscribe({
      next: (res) => {
        this.purgePreviewText =
          res?.warning ||
          'Diese Löschung ist unwiderruflich. Alle personenbezogenen Daten werden dauerhaft entfernt.';
      },
      error: () => {
        this.purgePreviewText =
          'Diese Löschung ist unwiderruflich. Alle personenbezogenen Daten werden dauerhaft entfernt.';
      }
    });
  }

  closePurgeModal(): void {
    this.purgeModalOpen = false;
    this.purgeTarget = null;
    this.purgeConfirmText = '';
    this.purgePreviewText = '';
  }

  confirmPurge(): void {
    if (!this.purgeTarget) return;

    const txt = (this.purgeConfirmText || '').trim();
    if (txt !== 'LÖSCHEN') {
      this.setStatus('warning', 'Bestätigung fehlt', 'Bitte tippe exakt "LÖSCHEN" ein, um fortzufahren.');
      return;
    }

    this.purgeSaving = true;
    this.clearStatus();

    this.userService.purgeConfirm(this.purgeTarget.userId, txt).subscribe({
      next: () => {
        this.purgeSaving = false;
        this.setStatus('success', 'Gelöscht', 'Der Nutzer wurde unwiderruflich gelöscht (inkl. E-Mail an den Nutzer).');
        this.closePurgeModal();

        // Refresh: Userliste + Pending
        this.loadUsers();
        this.loadPendingDeletions();
      },
      error: (err) => {
        this.purgeSaving = false;
        console.error(err);
        this.setStatus('error', 'Löschen fehlgeschlagen', err?.error?.message || err?.message || 'Unbekannter Fehler');
      }
    });
  }

  fmtDate(s: any): string {
    const d = new Date(String(s ?? ''));
    if (isNaN(d.getTime())) return String(s ?? '');
    return d.toLocaleString('de-AT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  clearStatus(): void {
    this.statusType = '';
    this.statusTitle = '';
    this.statusMsg = '';
  }

  setStatus(type: StatusType, title: string, msg: string): void {
    this.statusType = type;
    this.statusTitle = title;
    this.statusMsg = msg;
  }
}