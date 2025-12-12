import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import { MealPlan } from '../../models/meal-plan.model';
import { MenuService } from '../services/menu-manager/menu-manager';

@Component({
  selector: 'app-menu-manager',
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.css'
})
export class MenuManager implements OnInit {
  Menus: MealPlan[] = [];
  selectedMenu: MealPlan | null = null;

  // optional für UX
  loading = false;
  loadError: string | null = null;

  constructor(
    private router: Router,
    private menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.loadMenus();
  }

  private loadMenus(): void {
    this.loading = true;
    this.loadError = null;

    this.menuService.getMenus().subscribe({
      next: (menus) => {
        this.Menus = menus;
        this.loading = false;
      },
      error: (err) => {
        // Dank catchError im Service sollte das eigentlich nicht passieren,
        // aber zur Sicherheit fangen wir es dennoch ab.
        console.error('Unerwarteter Fehler beim Laden der Menüs:', err);
        this.loading = false;
        this.loadError = 'Menüs konnten nicht geladen werden.';
      }
    });
  }

  private async loadLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = 'assets/logo.png'; // Pfad zu deinem Logo
    });
  }

  goToMenuPlanner(menu: MealPlan) {
    this.router.navigate(['menuplaner'], { state: { menu } });
  }

  selectMenu(menu: MealPlan): void {
    if (menu !== this.selectedMenu) {
      this.selectedMenu = menu;
    } else {
      this.selectedMenu = null;
    }
  }

  removeMenu(menu: MealPlan): void {
    // Optimistisches Update: erst im UI entfernen
    const previousMenus = [...this.Menus];
    this.Menus = this.Menus.filter((m) => m !== menu);
    if (this.selectedMenu === menu) {
      this.selectedMenu = null;
    }

    this.menuService.deleteMenu(menu.id).subscribe({
      error: (err) => {
        console.error('Fehler beim Löschen des Menüs:', err);
        // Bei Fehler alten Zustand wiederherstellen
        this.Menus = previousMenus;
      }
    });
  }

  /**
   * Erstellt eine A4-Speisekarte im ansprechenden Layout:
   * Gericht links groß, Preis rechts groß, Beschreibung + Allergene darunter.
   */
  async printMenu(menu: MealPlan): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // Farben
    const headerBlue = { r: 14, g: 165, b: 233 }; // #0ea5e9
    const falafelGreen = { r: 16, g: 185, b: 129 };
    const pricePill = { r: 219, g: 234, b: 254 };
    const textDark = { r: 15, g: 23, b: 42 };
    const textMuted = { r: 100, g: 116, b: 139 };

    // Header-Hintergrund
    doc.setFillColor(headerBlue.r, headerBlue.g, headerBlue.b);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo
    const logo = await this.loadLogo();
    if (logo) {
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      const logoX = marginLeft;
      const logoY = 8;
      doc.addImage(logo, logoX, logoY, logoWidth, logoHeight);
    }

    // Titel "Speisekarte"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Speisekarte', pageWidth / 2, 16, { align: 'center' });

    // Menü-Titel
    const title = menu.title?.trim() || '';
    if (title) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(title, pageWidth / 2, 25, { align: 'center' });
    }

    // Datum rechts oben
    const today = new Date().toLocaleDateString('de-AT');
    doc.setFontSize(11);
    const headerRightX = pageWidth - marginRight;
    doc.text(`Gültig am ${today}`, headerRightX, 14, { align: 'right' });

    let y = 52;

    // Intro
    doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const intro = 'Alle Speisen frisch zubereitet – Änderungen vorbehalten.';
    const introLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(introLines, pageWidth / 2, y, { align: 'center' });

    y += introLines.length * 5 + 8;

    // Gerichte
    doc.setLineHeightFactor(1.3);

    for (const dish of menu.dishes) {
      if (y > 260) {
        doc.addPage();

        // kleiner Header auf Folgeseiten
        doc.setFillColor(headerBlue.r, headerBlue.g, headerBlue.b);
        doc.rect(0, 0, pageWidth, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(menu.title || 'Speisekarte', marginLeft, 13);
        y = 32;
      }

      const name = dish.name ?? '';
      const lower = name.toLowerCase();
      const priceNumber = (dish.price ?? 0).toFixed(2).replace('.', ',');
      const euroLabel = '€';
      const priceX = pageWidth - marginRight;
      const euroX = priceX - 23;

      // Preis-Kapsel
      const priceBgWidth = 40;
      const priceBgHeight = 13;
      const priceBgX = pageWidth - marginRight - priceBgWidth;
      const priceBgY = y - 9;

      doc.setFillColor(pricePill.r, pricePill.g, pricePill.b);
      doc.setDrawColor(headerBlue.r, headerBlue.g, headerBlue.b);
      doc.setLineWidth(0.4);
      doc.roundedRect(priceBgX, priceBgY, priceBgWidth, priceBgHeight, 3, 3, 'FD');

      // Gerichtstitel (Falafel-Highlight)
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      let xText = marginLeft;

      const falafelIndex = lower.indexOf('falafel');
      if (falafelIndex >= 0) {
        const before = name.slice(0, falafelIndex);
        const highlight = name.slice(falafelIndex, falafelIndex + 'falafel'.length);
        const after = name.slice(falafelIndex + 'falafel'.length);

        if (before.trim().length > 0) {
          doc.setTextColor(textDark.r, textDark.g, textDark.b);
          doc.text(before, xText, y);
          xText += doc.getTextWidth(before);
        }

        doc.setTextColor(falafelGreen.r, falafelGreen.g, falafelGreen.b);
        doc.text(highlight, xText, y);
        xText += doc.getTextWidth(highlight);

        if (after.trim().length > 0) {
          doc.setTextColor(textDark.r, textDark.g, textDark.b);
          doc.text(after, xText, y);
        }
      } else {
        doc.setTextColor(textDark.r, textDark.g, textDark.b);
        doc.text(name, marginLeft, y);
      }

      // Preis-Text
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(headerBlue.r, headerBlue.g, headerBlue.b);

      doc.text(euroLabel, euroX, y - 1);
      doc.text(priceNumber, priceX, y - 1, { align: 'right' });

      // Beschreibung
      if (dish.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);

        const wrappedDesc = doc.splitTextToSize(
          dish.description,
          contentWidth * 0.9
        );
        const centerX = pageWidth / 2;
        y += 7;
        doc.text(wrappedDesc, centerX, y, { align: 'center' });

        y += wrappedDesc.length * 5.5;
      }

      // Allergene
      if ((dish as any).allergenes && (dish as any).allergenes.length > 0) {
        const allergenes = (dish as any).allergenes as string[];
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);

        const allergenText = `Allergene: ${allergenes.join(', ')}`;
        const centerX = pageWidth / 2;
        y += 4;
        doc.text(allergenText, centerX, y, { align: 'center' });
      }

      // Trennlinie
      y += 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, y, pageWidth - marginRight, y);

      y += 14;
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
    }

    // Fußzeile
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);

    doc.text(
      'Alle Preise in Euro inkl. gesetzlicher MwSt. | Allergene gemäß Aushang',
      pageWidth / 2,
      285,
      { align: 'center' }
    );

    const fileName = (menu.title || 'speisekarte')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    doc.save(`${fileName}.pdf`);
  }
}
