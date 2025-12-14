import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

import { MealPlan } from '../../models/meal-plan.model';
import { MenuManagerService } from '../services/menu-manager/menu-manager';

@Component({
  selector: 'app-menu-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-manager.html',
  styleUrls: ['./menu-manager.css']
})
export class MenuManager implements OnInit {
  Menus: MealPlan[] = [];
  selectedMenu: MealPlan | null = null;

  loading = false;
  loadError: string | null = null;

  constructor(
    private router: Router,
    private menuService: MenuManagerService // ✅ richtiger Service
  ) {}

  ngOnInit(): void {
    this.loadMenus();
  }

  private loadMenus(): void {
    this.loading = true;
    this.loadError = null;

    this.menuService.getMenus().subscribe({
      next: (menus: MealPlan[]) => {
        // ✅ defensiv: falls dishes undefined ist
        this.Menus = (menus ?? []).map(m => ({
          ...m,
          dishes: m.dishes ?? []
        }));

        this.loading = false;
      },
      error: (err) => {
        console.error('Unerwarteter Fehler beim Laden der Menüs:', err);
        this.loading = false;
        this.loadError = 'Menüs konnten nicht geladen werden.';
      }
    });
  }

  private async loadLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'assets/logo.png';
    });
  }

  goToMenuPlanner(menu: MealPlan) {
    this.router.navigate(['menuplaner'], { state: { menu } });
  }

  selectMenu(menu: MealPlan): void {
    this.selectedMenu = (menu !== this.selectedMenu) ? menu : null;
  }

  removeMenu(menu: MealPlan): void {
    const previousMenus = [...this.Menus];
    this.Menus = this.Menus.filter((m) => m !== menu);

    if (this.selectedMenu === menu) {
      this.selectedMenu = null;
    }

    this.menuService.deleteMenu(menu.id).subscribe({
      error: (err) => {
        console.error('Fehler beim Löschen des Menüs:', err);
        this.Menus = previousMenus;
      }
    });
  }

  async printMenu(menu: MealPlan): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;

    const headerBlue = { r: 14, g: 165, b: 233 };
    const falafelGreen = { r: 16, g: 185, b: 129 };
    const pricePill = { r: 219, g: 234, b: 254 };
    const textDark = { r: 15, g: 23, b: 42 };
    const textMuted = { r: 100, g: 116, b: 139 };

    doc.setFillColor(headerBlue.r, headerBlue.g, headerBlue.b);
    doc.rect(0, 0, pageWidth, 40, 'F');

    const logo = await this.loadLogo();
    if (logo) {
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, marginLeft, 8, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('Speisekarte', pageWidth / 2, 16, { align: 'center' });

    const title = menu.title?.trim() || '';
    if (title) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(title, pageWidth / 2, 25, { align: 'center' });
    }

    const today = new Date().toLocaleDateString('de-AT');
    doc.setFontSize(11);
    doc.text(`Gültig am ${today}`, pageWidth - marginRight, 14, { align: 'right' });

    let y = 52;

    doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    const intro = 'Alle Speisen frisch zubereitet – Änderungen vorbehalten.';
    const introLines = doc.splitTextToSize(intro, contentWidth);
    doc.text(introLines, pageWidth / 2, y, { align: 'center' });

    y += introLines.length * 5 + 8;

    doc.setLineHeightFactor(1.3);

    // ✅ defensiv: falls dishes fehlt
    const dishes = menu.dishes ?? [];

    for (const dish of dishes) {
      if (y > 260) {
        doc.addPage();
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
      const priceX = pageWidth - marginRight;
      const euroX = priceX - 23;

      const priceBgWidth = 40;
      const priceBgHeight = 13;
      const priceBgX = pageWidth - marginRight - priceBgWidth;
      const priceBgY = y - 9;

      doc.setFillColor(pricePill.r, pricePill.g, pricePill.b);
      doc.setDrawColor(headerBlue.r, headerBlue.g, headerBlue.b);
      doc.setLineWidth(0.4);
      doc.roundedRect(priceBgX, priceBgY, priceBgWidth, priceBgHeight, 3, 3, 'FD');

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

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(headerBlue.r, headerBlue.g, headerBlue.b);
      doc.text('€', euroX, y - 1);
      doc.text(priceNumber, priceX, y - 1, { align: 'right' });

      if (dish.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);

        const wrappedDesc = doc.splitTextToSize(dish.description, contentWidth * 0.9);
        y += 7;
        doc.text(wrappedDesc, pageWidth / 2, y, { align: 'center' });
        y += wrappedDesc.length * 5.5;
      }

      const allergenes = (dish as any).allergenes as string[] | undefined;
      if (allergenes?.length) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        y += 4;
        doc.text(`Allergene: ${allergenes.join(', ')}`, pageWidth / 2, y, { align: 'center' });
      }

      y += 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, y, pageWidth - marginRight, y);

      y += 14;
      doc.setTextColor(textDark.r, textDark.g, textDark.b);
    }

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
