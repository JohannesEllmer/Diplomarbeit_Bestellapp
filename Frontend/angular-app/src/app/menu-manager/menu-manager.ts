import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';

import { MealPlan } from '../../models/meal-plan.model';
import { MenuManagerService } from '../services/menu-manager/menu-manager';
import {
  SettingsService,
  OrderingState,
  SetOrderingResponse
} from '../services/settings/settings.service';

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

  activeMenuId: string | null = null;

  loading = false;
  loadError: string | null = null;
  activating = false;

  orderingEnabled = true;
  togglingOrdering = false;

  constructor(
    private router: Router,
    private menuService: MenuManagerService,
    private settings: SettingsService,
  ) {}

  ngOnInit(): void {
    this.loadMenus();
    this.loadSettings();
  }

  private loadSettings(): void {
    this.settings.getOrderingEnabled().subscribe({
      next: (s: OrderingState) => {
        this.orderingEnabled = !!s?.orderingEnabled;
      },
      error: () => {
        // Fallback
        this.orderingEnabled = true;
      }
    });
  }

  toggleOrdering(): void {
    if (this.togglingOrdering) return;
    this.togglingOrdering = true;

    const next = !this.orderingEnabled;

    this.settings.setOrderingEnabled(next).subscribe({
      next: (res: SetOrderingResponse) => {
        this.togglingOrdering = false;

        if (!res?.ok) return;

        this.orderingEnabled = !!res.orderingEnabled;
      },
      error: () => {
        this.togglingOrdering = false;
      }
    });
  }

  private loadMenus(): void {
    this.loading = true;
    this.loadError = null;

    this.menuService.getMenus().subscribe({
      next: (menus: MealPlan[]) => {
        this.Menus = (menus ?? []).map(m => ({
          ...m,
          menuItems: (m as any).menuItems ?? [],
        }));

        this.loading = false;
        this.loadActiveMenuId();
      },
      error: (err) => {
        console.error('Unerwarteter Fehler beim Laden der Menüs:', err);
        this.loading = false;
        this.loadError = 'Menüs konnten nicht geladen werden.';
      }
    });
  }

  private loadActiveMenuId(): void {
    this.menuService.getSelectedMealPlan().subscribe({
      next: (plan) => {
        this.activeMenuId = plan?.id ?? null;
        this.Menus = this.Menus.map(m => ({
          ...m,
          isSelected: !!this.activeMenuId && m.id === this.activeMenuId
        }));
      },
      error: () => {
        this.activeMenuId = null;
      }
    });
  }

  goToMenuPlanner(menu: MealPlan) {
    this.router.navigate(['menuplaner'], { state: { menu } });
  }

  selectMenu(menu: MealPlan): void {
    if (!menu?.id) return;
    if (this.activating) return;

    this.selectedMenu = menu;
    this.loadError = null;

    if (this.activeMenuId === menu.id) {
      this.Menus = this.Menus.map(m => ({ ...m, isSelected: m.id === menu.id }));
      return;
    }

    this.activating = true;

    this.menuService.setSelected(menu.id).subscribe({
      next: (res) => {
        this.activating = false;

        if (!res?.ok) {
          this.loadError = 'Menü konnte nicht aktiviert werden (API).';
          this.loadActiveMenuId();
          return;
        }

        this.activeMenuId = menu.id;
        this.Menus = this.Menus.map(m => ({
          ...m,
          isSelected: m.id === menu.id
        }));
      },
      error: (err) => {
        console.error('Aktiv setzen fehlgeschlagen:', err);
        this.activating = false;
        this.loadError = 'Menü konnte nicht aktiviert werden.';
        this.loadActiveMenuId();
      }
    });
  }

  removeMenu(menu: MealPlan): void {
    const previousMenus = [...this.Menus];
    this.Menus = this.Menus.filter((m) => m !== menu);

    if (this.selectedMenu?.id === menu.id) this.selectedMenu = null;
    if (this.activeMenuId === menu.id) this.activeMenuId = null;

    this.menuService.deleteMenu(menu.id).subscribe({
      error: (err) => {
        console.error('Fehler beim Löschen des Menüs:', err);
        this.Menus = previousMenus;
      }
    });
  }
  
  async printMenu(menu: MealPlan): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const M = 14;
    const headerH = 32;
    const footerH = 14;
    const contentW = pageW - M * 2;

    const C = {
      brand: { r: 17, g: 94, b: 163 },
      brand2: { r: 59, g: 130, b: 246 },
      ink: { r: 15, g: 23, b: 42 },
      muted: { r: 100, g: 116, b: 139 },
      line: { r: 226, g: 232, b: 240 },
      soft: { r: 241, g: 245, b: 249 },
      card: { r: 255, g: 255, b: 255 },
      vegBg: { r: 236, g: 253, b: 245 },
      veg: { r: 16, g: 185, b: 129 },
      pillBg: { r: 219, g: 234, b: 254 },
    };

    const fill = (rgb: { r: number; g: number; b: number }) => doc.setFillColor(rgb.r, rgb.g, rgb.b);
    const stroke = (rgb: { r: number; g: number; b: number }) => doc.setDrawColor(rgb.r, rgb.g, rgb.b);
    const text = (rgb: { r: number; g: number; b: number }) => doc.setTextColor(rgb.r, rgb.g, rgb.b);

    const roundRect = (x: number, y: number, w: number, h: number, r = 4, style: 'S'|'F'|'FD' = 'S') => {
      doc.roundedRect(x, y, w, h, r, r, style);
    };

    const safeStr = (v: any) => (v === null || v === undefined) ? '' : String(v);
    const safeNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const fmtEUR = (v: any) => {
      const n = safeNum(v);
      return n.toFixed(2).replace('.', ',') + ' €';
    };

    const today = new Date().toLocaleDateString('de-AT');
    const menuTitle = (menu?.title ?? 'Speisekarte').trim() || 'Speisekarte';

    const companyLines = [
      'HungerSatt Schulbistro · Alte Bundestraße 11 - 5600 St. Johann',
      'Markus Gruber · UID: 68016602'
    ];

    const itemsRaw = Array.isArray((menu as any)?.menuItems) ? (menu as any).menuItems : [];
    const items = itemsRaw.map((x: any) => ({
      id: safeStr(x.id),
      name: safeStr(x.name).trim(),
      description: safeStr(x.description).trim(),
      category: safeStr(x.category).trim() || 'Sonstiges',
      price: safeNum(x.price),
      vegetarian: !!x.vegetarian,
      available: x.available !== false,
      allergens: Array.isArray(x.allergens) ? x.allergens.map((a: any) => safeStr(a)).filter(Boolean) : [],
    }));

    const menuDrink = safeStr((menu as any)?.drink).trim();
    const menuDessert = safeStr((menu as any)?.dessert).trim();

    const preferredOrder = ['Hauptgericht', 'Hauptspeise', 'Dessert', 'Nachspeise', 'Getränk', 'Getraenk', 'Snack', 'Sonstiges'];

    type PdfMenuItem = {
      id: string;
      name: string;
      description: string;
      category: string;
      price: number;
      vegetarian: boolean;
      available: boolean;
      allergens: string[];
    };

    const groupByCategory = (rows: PdfMenuItem[]) => {
      const map = new Map<string, PdfMenuItem[]>();
      for (const it of rows) {
        const key = it.category || 'Sonstiges';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(it);
      }

      const cats = Array.from(map.keys());
      cats.sort((a, b) => {
        const ia = preferredOrder.findIndex(p => p.toLowerCase() === a.toLowerCase());
        const ib = preferredOrder.findIndex(p => p.toLowerCase() === b.toLowerCase());
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });

      return cats.map((c) => ({
        category: c,
        items: map.get(c)!.sort((x: PdfMenuItem, y: PdfMenuItem) => x.name.localeCompare(y.name)),
      }));
    };

    const grouped = groupByCategory(items);

    const ensureSpace = (y: number, needed: number, pageIndex: number) => {
      const bottomLimit = pageH - footerH - 6;
      if (y + needed <= bottomLimit) return { y, pageIndex };

      drawFooter(pageIndex);
      doc.addPage();
      pageIndex++;
      drawHeader(pageIndex);
      return { y: headerH + 10, pageIndex };
    };

    const drawHeader = (pageIndex: number) => {
      fill(C.soft);
      doc.rect(0, 0, pageW, headerH, 'F');

      fill(C.brand);
      doc.rect(0, 0, pageW, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      text(C.ink);
      doc.text('Speisekarte', M, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      text(C.muted);
      doc.text(menuTitle, M, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      text(C.muted);
      doc.text(`Stand: ${today}`, pageW - M, 16, { align: 'right' });

      doc.setFontSize(9);
      doc.text(`Seite ${pageIndex}`, pageW - M, 23, { align: 'right' });

      stroke(C.line);
      doc.setLineWidth(0.3);
      doc.line(M, headerH - 2, pageW - M, headerH - 2);
    };

    const drawFooter = (pageIndex: number) => {
      stroke(C.line);
      doc.setLineWidth(0.3);
      doc.line(M, pageH - footerH, pageW - M, pageH - footerH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      text(C.muted);

      doc.text(companyLines[0], M, pageH - 7);
      doc.text(companyLines[1], M, pageH - 3);

      doc.text(`Seite ${pageIndex}`, pageW - M, pageH - 5, { align: 'right' });
    };

    const drawMenuExtrasBox = (y: number) => {
      const hasExtras = !!menuDrink || !!menuDessert;
      if (!hasExtras) return y;

      const boxH = 14;
      fill(C.pillBg);
      stroke(C.line);
      doc.setLineWidth(0.35);
      roundRect(M, y, contentW, boxH, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      text(C.brand);
      doc.text('Menü-Extras', M + 6, y + 6.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      text(C.ink);

      const parts: string[] = [];
      if (menuDrink) parts.push(`Getränk: ${menuDrink}`);
      if (menuDessert) parts.push(`Dessert: ${menuDessert}`);

      doc.text(parts.join('  ·  '), M + 6, y + 11.8);

      return y + boxH + 8;
    };

    const drawSectionTitle = (y: number, title: string) => {
      const h = 10;

      fill(C.soft);
      stroke(C.line);
      doc.setLineWidth(0.35);
      roundRect(M, y, contentW, h, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      text(C.ink);
      doc.text(title.toUpperCase(), M + 6, y + 6.8);

      return y + h + 6;
    };

    const drawItemCard = (it: any, y: number) => {
      const cardX = M;
      const cardW = contentW;

      const name = safeStr(it.name) || 'Gericht';
      const desc = safeStr(it.description);
      const allergens = (it.allergens ?? []) as string[];
      const priceStr = fmtEUR(it.price);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      const nameLines = doc.splitTextToSize(name, cardW - 48);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.2);
      const descLines = desc ? doc.splitTextToSize(desc, cardW - 12) : [];

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.3);
      const allergenText = allergens.length ? `Allergene: ${allergens.join(', ')}` : '';
      const allergenLines = allergenText ? doc.splitTextToSize(allergenText, cardW - 12) : [];

      const basePad = 8;
      const nameH = nameLines.length * 5.2;
      const descH = descLines.length ? (descLines.length * 4.6 + 1.5) : 0;
      const allH = allergenLines.length ? (allergenLines.length * 4.2 + 1) : 0;
      const badgeH = it.vegetarian ? 7 : 0;

      const cardH = basePad + nameH + descH + allH + badgeH + 8;

      fill({ r: 15, g: 23, b: 42 });
      (doc as any).setGState?.(new (doc as any).GState({ opacity: 0.05 }));
      roundRect(cardX + 1.2, y + 1.2, cardW, cardH, 5, 'F');
      (doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }));

      fill(C.card);
      stroke(C.line);
      doc.setLineWidth(0.35);
      roundRect(cardX, y, cardW, cardH, 5, 'FD');

      fill(it.available ? C.brand2 : C.muted);
      doc.rect(cardX, y, 2.2, cardH, 'F');

      const pillW = 34;
      const pillH = 9;
      const pillX = cardX + cardW - pillW - 7;
      const pillY = y + 7;

      fill(C.pillBg);
      stroke(C.line);
      doc.setLineWidth(0.25);
      roundRect(pillX, pillY, pillW, pillH, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      text(C.ink);
      doc.text(priceStr, pillX + pillW / 2, pillY + 6.2, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      text(C.ink);
      doc.text(nameLines, cardX + 8, y + 12);

      let yy = y + 12 + nameLines.length * 5.2;

      if (it.vegetarian) {
        const bW = 26;
        const bH = 6.5;
        const bX = cardX + 8;
        const bY = yy + 2;

        fill(C.vegBg);
        stroke(C.veg);
        doc.setLineWidth(0.3);
        roundRect(bX, bY, bW, bH, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        text(C.veg);
        doc.text('VEGETARISCH', bX + bW / 2, bY + 4.7, { align: 'center' });

        yy += 9;
      } else {
        yy += 2;
      }

      if (descLines.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.2);
        text(C.muted);
        doc.text(descLines, cardX + 8, yy + 4.2);
        yy += descLines.length * 4.6 + 1.5;
      }

      if (allergenLines.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.3);
        text({ r: 148, g: 163, b: 184 } as any);
        doc.text(allergenLines, cardX + 8, yy + 4);
        yy += allergenLines.length * 4.2 + 1;
      }

      if (it.available === false) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        text({ r: 220, g: 38, b: 38 } as any);
        doc.text('Nicht verfügbar', cardX + cardW - 8, y + cardH - 5, { align: 'right' });
      }

      return { nextY: y + cardH + 7, height: cardH + 7 };
    };

    let pageIndex = 1;
    drawHeader(pageIndex);

    let y = headerH + 10;

    fill(C.soft);
    stroke(C.line);
    roundRect(M, y, contentW, 12, 4, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.2);
    text(C.muted);
    doc.text('Alle Preise in Euro inkl. gesetzlicher MwSt. · Änderungen vorbehalten.', M + 6, y + 7.8);
    y += 18;

    y = drawMenuExtrasBox(y);

    if (!grouped.length || grouped.every(g => !g.items.length)) {
      const space = ensureSpace(y, 30, pageIndex);
      y = space.y; pageIndex = space.pageIndex;

      fill(C.soft);
      stroke(C.line);
      roundRect(M, y, contentW, 18, 5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      text(C.ink);
      doc.text('Keine Gerichte vorhanden.', M + 6, y + 11);
      drawFooter(pageIndex);

      doc.save(`${menuTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`);
      return;
    }

    for (const section of grouped) {
      if (!section.items.length) continue;

      let res = ensureSpace(y, 18, pageIndex);
      y = res.y; pageIndex = res.pageIndex;

      y = drawSectionTitle(y, section.category);

      for (const it of section.items) {
        res = ensureSpace(y, 42, pageIndex);
        y = res.y; pageIndex = res.pageIndex;

        const r = drawItemCard(it, y);
        y = r.nextY;
      }

      y += 2;
    }

    drawFooter(pageIndex);

    const fileName = (menuTitle || 'speisekarte')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    doc.save(`${fileName}.pdf`);
  }
}
