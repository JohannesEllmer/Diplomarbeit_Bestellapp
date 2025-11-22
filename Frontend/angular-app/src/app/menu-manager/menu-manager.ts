import { Component } from '@angular/core';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import { MealPlan } from '../../models/meal-plan.model';

@Component({
  selector: 'app-menu-manager',
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.css'
})
export class MenuManager {
  Menus: MealPlan[] = [
    {
      id: '0',
      title: 'Tagesmenü',
      dishes: [
        {
          id: '1',
          name: 'Kürbiscremesuppe',
          description: 'Cremige Suppe aus Hokkaido-Kürbis mit Kernöl',
          price: 6.5,
          allergenes: ['Gluten', 'Milch']
        },
        {
          id: '2',
          name: 'Wiener Schnitzel',
          description: 'Klassisches Kalbsschnitzel mit Kartoffelsalat',
          price: 18.9,
          allergenes: ['Gluten', 'Ei', 'Milch']
        },
        {
          id: '3',
          name: 'Apfelstrudel',
          description: 'Hausgemachter Strudel mit Vanillesoße',
          price: 6.9,
          allergenes: ['Gluten', 'Ei', 'Milch', 'Nüsse']
        }
      ]
    },
    {
      id: '1',
      title: 'Vegetarisches Menü',
      dishes: [
        {
          id: '1',
          name: 'Gemüsesuppe',
          description: 'Klare Suppe mit Frühlingsgemüse',
          price: 5.9,
          allergenes: ['Sellerie']
        },
        {
          id: '2',
          name: 'Spinatknödel',
          description: 'Hausgemachte Knödel mit Salbeibutter',
          price: 14.9,
          allergenes: ['Gluten', 'Ei', 'Milch']
        }
      ]
    },
    {
      id: '2',
      title: 'Bayerische Spezialitäten',
      dishes: [
        {
          id: '1',
          name: 'Leberkäse',
          description: 'Mit Spiegelei und Kartoffelsalat',
          price: 11.9
        },
        {
          id: '2',
          name: 'Schweinebraten',
          description: 'Mit Knödel und Sauerkraut',
          price: 16.9
        },
        {
          id: '3',
          name: 'Obatzda',
          description: 'Mit Brezel und Radieschen',
          price: 8.9
        }
      ]
    }
  ];

  selectedMenu: MealPlan | null = null;

  constructor(private router: Router) {}

  private async loadLogo(): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = 'assets/logo.png'; // Adjust path to your logo
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
    this.Menus = this.Menus.filter((m) => m !== menu);
    if (this.selectedMenu === menu) {
      this.selectedMenu = null;
    }
  }

 /**
 * Erstellt eine A4-PDF-Seite im „Speisekarten-Stil“:
 * Gericht links groß, Preis rechts groß, darunter Beschreibung.
 */
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
  const headerBlue = { r: 14, g: 165, b: 233 }; // #0ea5e9 wie dein Header
  const falafelGreen = { r: 16, g: 185, b: 129 }; // Highlight-Farbe
  const pricePill = { r: 219, g: 234, b: 254 }; // helles Blau
  const textDark = { r: 15, g: 23, b: 42 };
  const textMuted = { r: 100, g: 116, b: 139 };

  // ---------- Header mit Logo ----------
  doc.setFillColor(headerBlue.r, headerBlue.g, headerBlue.b);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo laden & einfügen
  const logo = await this.loadLogo();
  if (logo) {
    const logoHeight = 18;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    const logoX = marginLeft;
    const logoY = 8;
    doc.addImage(logo, logoX, logoY, logoWidth, logoHeight);
  }

  // "Speisekarte" zentriert
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('Speisekarte', pageWidth / 2, 16, { align: 'center' });

  // Menü-Titel (z. B. Tagesmenü) unterhalb
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

  // Startposition für Inhalt
  let y = 52;

  // ---------- Intro / Hinweis ----------
  doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  const intro = 'Alle Speisen frisch zubereitet – Änderungen vorbehalten.';
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, pageWidth / 2, y, { align: 'center' });

  y += introLines.length * 5 + 8;

  // ---------- Gerichte ----------
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

    // --- Preis-Kapsel (rechts) ---
    const priceBgWidth = 40;
    const priceBgHeight = 13;
    const priceBgX = pageWidth - marginRight - priceBgWidth;
    const priceBgY = y - 9;

    doc.setFillColor(pricePill.r, pricePill.g, pricePill.b);
    doc.setDrawColor(headerBlue.r, headerBlue.g, headerBlue.b);
    doc.setLineWidth(0.4);
    doc.roundedRect(priceBgX, priceBgY, priceBgWidth, priceBgHeight, 3, 3, 'FD');

    // --- Gerichtstitel links (evtl. Falafel-Highlight) ---
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

    // --- Preis in der Kapsel ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(headerBlue.r, headerBlue.g, headerBlue.b);

    doc.text(euroLabel, euroX, y - 1);
    doc.text(priceNumber, priceX, y - 1, { align: 'right' });

    // --- Beschreibung (zentriert) ---
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

    // --- Allergene ---
    if (dish.allergenes && dish.allergenes.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);

      const allergenText = `Allergene: ${dish.allergenes.join(', ')}`;
      const centerX = pageWidth / 2;
      y += 4;
      doc.text(allergenText, centerX, y, { align: 'center' });
    }

    // --- Trennlinie & Abstand zum nächsten Gericht ---
    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, pageWidth - marginRight, y);

    y += 14;
    doc.setTextColor(textDark.r, textDark.g, textDark.b);
  }

  // ---------- Fußzeile ----------
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