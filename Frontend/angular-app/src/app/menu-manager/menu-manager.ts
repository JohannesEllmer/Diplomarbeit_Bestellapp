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

  activeMenuId: string | null = null;

  loading = false;
  loadError: string | null = null;
  activating = false;

  constructor(
    private router: Router,
    private menuService: MenuManagerService
  ) {}

    ngOnInit(): void {
    this.loadMenus();
  }

  private loadMenus(): void {
    this.loading = true;
    this.loadError = null;

    this.menuService.getMenus().subscribe({
      next: (menus: MealPlan[]) => {
        this.Menus = (menus ?? []).map(m => ({
          ...m,
          dishes: (m as any).dishes ?? []
        })) as any;

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
          ...(m as any),
          isSelected: !!this.activeMenuId && m.id === this.activeMenuId
        })) as any;
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
      this.Menus = this.Menus.map(m => ({ ...(m as any), isSelected: m.id === menu.id })) as any;
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
          ...(m as any),
          isSelected: m.id === menu.id
        })) as any;
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


  // -------------------------
  // ✅ PDF: MUCH NICER VERSION (dein Code bleibt wie du ihn gepostet hast)
  // -------------------------
  async printMenu(menu: MealPlan): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const M = 14;
    const headerH = 34;
    const footerH = 12;
    const contentW = pageW - M * 2;

    const C = {
      primary: { r: 14, g: 165, b: 233 },
      primaryDark: { r: 3, g: 105, b: 161 },
      soft: { r: 224, g: 250, b: 255 },
      ink: { r: 15, g: 23, b: 42 },
      muted: { r: 100, g: 116, b: 139 },
      line: { r: 226, g: 232, b: 240 },
      card: { r: 250, g: 252, b: 255 },
      card2: { r: 243, g: 248, b: 255 },
      pill: { r: 219, g: 234, b: 254 },
      veg: { r: 16, g: 185, b: 129 },
      warn: { r: 245, g: 158, b: 11 },
    };

    const menuTitle = (menu.title ?? 'Speisekarte').trim() || 'Speisekarte';
    const today = new Date().toLocaleDateString('de-AT');

    const setColor = (rgb: {r:number;g:number;b:number}) => doc.setTextColor(rgb.r, rgb.g, rgb.b);
    const fill = (rgb: {r:number;g:number;b:number}) => doc.setFillColor(rgb.r, rgb.g, rgb.b);
    const stroke = (rgb: {r:number;g:number;b:number}) => doc.setDrawColor(rgb.r, rgb.g, rgb.b);

    const roundRect = (x:number, y:number, w:number, h:number, r=3, style:'S'|'F'|'FD'='S') => {
      // @ts-ignore
      doc.roundedRect(x, y, w, h, r, r, style);
    };

    const safeStr = (v:any) => (v === null || v === undefined) ? '' : String(v);
    const safeNum = (v:any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const getAllergens = (dish:any): string[] => {
      const a1 = (dish as any).allergenes;
      const a2 = (dish as any).allergens;
      const arr = Array.isArray(a1) ? a1 : Array.isArray(a2) ? a2 : [];
      return arr.map((x:any) => String(x)).filter(Boolean);
    };

    const groupByCategory = (dishes:any[]): Array<{ category: string; items: any[] }> => {
      const map = new Map<string, any[]>();
      for (const d of dishes) {
        const cat = (safeStr(d?.category).trim() || 'Sonstiges');
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(d);
      }
      const preferred = ['Hauptgericht', 'Hauptspeise', 'Dessert', 'Nachspeise', 'Getränk', 'Getraenk', 'Snack'];
      const keys = Array.from(map.keys());
      keys.sort((a,b) => {
        const ia = preferred.findIndex(p => p.toLowerCase() === a.toLowerCase());
        const ib = preferred.findIndex(p => p.toLowerCase() === b.toLowerCase());
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      });
      return keys.map(k => ({ category: k, items: map.get(k)! }));
    };

    const drawHeader = async (pageIndex:number) => {
      fill(C.primary);
      doc.rect(0, 0, pageW, headerH, 'F');

      fill(C.primaryDark);
      doc.rect(0, headerH - 4, pageW, 4, 'F');

    

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('Speisekarte', pageW / 2, 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(menuTitle, pageW / 2, 22, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Stand: ${today}`, pageW - M, 13, { align: 'right' });

      doc.setFontSize(9);
      doc.setTextColor(230, 247, 255);
      doc.text(`Seite ${pageIndex}`, pageW - M, 27, { align: 'right' });
    };

    const drawFooter = (pageIndex:number) => {
      stroke(C.line);
      doc.setLineWidth(0.3);
      doc.line(M, pageH - footerH, pageW - M, pageH - footerH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(C.muted);
      doc.text('Alle Preise in Euro inkl. gesetzlicher MwSt. | Allergene gemäß Aushang', M, pageH - 6);

      doc.setFontSize(8.5);
      doc.text(`Seite ${pageIndex}`, pageW - M, pageH - 6, { align: 'right' });
    };

    const drawSectionTitle = (y:number, title:string) => {
      fill(C.soft);
      stroke(C.line);
      roundRect(M, y, contentW, 10, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(C.primaryDark.r, C.primaryDark.g, C.primaryDark.b);
      doc.text(title.toUpperCase(), M + 6, y + 6.7);
      return y + 14;
    };

    const drawDishCard = (dish:any, y:number) => {
      const cardX = M;
      const cardW = contentW;

      const name = safeStr(dish?.name).trim() || 'Gericht';
      const desc = safeStr(dish?.description).trim();
      const price = safeNum(dish?.price);
      const isVeg = !!dish?.vegetarian;

      const allergens = getAllergens(dish);
      const allergensText = allergens.length ? `Allergene: ${allergens.join(', ')}` : '';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const nameLines = doc.splitTextToSize(name, cardW - 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const descLines = desc ? doc.splitTextToSize(desc, cardW - 12) : [];

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      const allLines = allergensText ? doc.splitTextToSize(allergensText, cardW - 12) : [];

      const base = 10;
      const nameH = nameLines.length * 5.2;
      const descH = descLines.length ? (descLines.length * 4.6 + 2) : 0;
      const allH = allLines.length ? (allLines.length * 4.2 + 1) : 0;
      const badgeH = isVeg ? 6 : 0;
      const cardH = base + nameH + descH + allH + badgeH + 6;

      fill({ r: 15, g: 23, b: 42 });
      (doc as any).setGState?.(new (doc as any).GState({ opacity: 0.06 }));
      roundRect(cardX + 1.2, y + 1.2, cardW, cardH, 5, 'F');
      (doc as any).setGState?.(new (doc as any).GState({ opacity: 1 }));

      fill(C.card);
      stroke(C.line);
      doc.setLineWidth(0.35);
      roundRect(cardX, y, cardW, cardH, 5, 'FD');

      fill(C.primary);
      doc.rect(cardX, y, 2.2, cardH, 'F');

      const pillW = 34;
      const pillH = 10;
      const pillX = cardX + cardW - pillW - 8;
      const pillY = y + 7;

      fill(C.pill);
      stroke(C.primary);
      doc.setLineWidth(0.35);
      roundRect(pillX, pillY, pillW, pillH, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(C.primaryDark.r, C.primaryDark.g, C.primaryDark.b);
      const priceStr = price.toFixed(2).replace('.', ',') + ' €';
      doc.text(priceStr, pillX + pillW / 2, pillY + 6.7, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(C.ink.r, C.ink.g, C.ink.b);
      doc.text(nameLines, cardX + 8, y + 12);

      let yy = y + 12 + nameLines.length * 5.2;

      if (isVeg) {
        const bW = 22;
        const bH = 6.5;
        const bX = cardX + 8;
        const bY = yy + 2;

        fill({ r: 236, g: 253, b: 245 });
        stroke(C.veg);
        doc.setLineWidth(0.35);
        roundRect(bX, bY, bW, bH, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(C.veg.r, C.veg.g, C.veg.b);
        doc.text('VEG', bX + bW / 2, bY + 4.6, { align: 'center' });

        yy += 9;
      } else {
        yy += 2;
      }

      if (descLines.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(C.muted.r, C.muted.g, C.muted.b);
        doc.text(descLines, cardX + 8, yy + 4.2);
        yy += descLines.length * 4.6 + 2;
      }

      if (allLines.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(148, 163, 184);
        doc.text(allLines, cardX + 8, yy + 4);
        yy += allLines.length * 4.2 + 1;
      }

      return { nextY: y + cardH + 8 };
    };

    const dishes = (menu as any).dishes ?? [];
    const grouped = groupByCategory(Array.isArray(dishes) ? dishes : []);

    let pageIndex = 1;
    await drawHeader(pageIndex);

    let y = headerH + 10;

    fill(C.card2);
    stroke(C.line);
    roundRect(M, y, contentW, 14, 5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(C.muted.r, C.muted.g, C.muted.b);
    doc.text('Alle Speisen frisch zubereitet – Änderungen vorbehalten.', M + 6, y + 8.8);
    y += 20;

    for (const sec of grouped) {
      if (y + 18 > pageH - footerH - 6) {
        drawFooter(pageIndex);
        doc.addPage();
        pageIndex++;
        await drawHeader(pageIndex);
        y = headerH + 10;
      }

      y = drawSectionTitle(y, sec.category);

      for (const dish of sec.items) {
        if (y + 50 > pageH - footerH - 6) {
          drawFooter(pageIndex);
          doc.addPage();
          pageIndex++;
          await drawHeader(pageIndex);
          y = headerH + 10;
        }

        const res = drawDishCard(dish, y);
        y = res.nextY;
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
