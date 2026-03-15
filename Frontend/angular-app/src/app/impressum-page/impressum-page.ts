import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { jsPDF } from 'jspdf';
import { SiteFooterComponent } from '../site-footer/footer';

@Component({
  selector: 'app-impressum-page',
  standalone: true,
  imports: [CommonModule, SiteFooterComponent],
  templateUrl: './impressum-page.component.html',
  styleUrls: ['./impressum-page.component.css'],
})
export class ImpressumPageComponent {
  readonly datenschutzText = `
Erklärung zur Informationspflicht

Datenschutzerklärung

In folgender Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Webseite. Wir erheben und verarbeiten personenbezogene Daten nur auf Grundlage der gesetzlichen Bestimmungen (Datenschutzgrundverordnung, Telekommunikationsgesetz 2003).

Sobald Sie als Benutzer auf unsere Webseite zugreifen oder diese besuchen wird Ihre IP-Adresse, Beginn sowie Beginn und Ende der Sitzung erfasst. Dies ist technisch bedingt und stellt somit ein berechtigtes Interesse im Sinne des Art. 6 Abs. 1 lit. f DSGVO dar.

Kontakt mit uns

Wenn Sie uns per E-Mail kontaktieren, werden die von Ihnen an uns übermittelten Daten zwecks Bearbeitung Ihrer Anfrage oder für den Fall von weiteren Anschlussfragen gespeichert. Es erfolgt keine Weitergabe Ihrer übermittelten Daten.

Datenspeicherung

Im Rahmen der Erleichterung des Einkaufsvorganges und zur späteren Vertragsabwicklung werden vom Betreiber im Rahmen von Cookies die IP-Adresse des Anschlussinhabers gespeichert, ebenso wie Name, E-Mail-Adresse, Klasse und Guthaben.

Für die Vertragsabwicklung werden auch folgende Daten bei uns gespeichert:
E-Mail, Schultyp, Name.

Die von Ihnen bereitgestellten Daten sind zur Vertragserfüllung bzw. zur Durchführung vorvertraglicher Maßnahmen erforderlich. Ohne diese Daten ist ein Vertragsabschluss nicht möglich. Eine Übermittlung der erhobenen Daten an Dritte erfolgt nicht.

Sollten Sie den Einkaufsvorgang abbrechen, werden die bei uns gespeicherten Daten gelöscht. Sollte ein Vertragsabschluss zustande kommen, werden sämtliche Daten aus dem Vertragsverhältnis bis zum Abschluss der Schullaufbahn gespeichert. Darüber hinaus werden Name, E-Mail, gekaufte Waren und Kaufdatum in diesem Zeitraum gespeichert und nachvollziehbar dokumentiert.

Die Datenverarbeitung erfolgt auf Grundlage der gesetzlichen Bestimmungen des § 96 Abs. 3 TKG sowie des Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und/oder lit. b DSGVO (Vertragserfüllung).

Cookies

Unsere Website verwendet sogenannte Cookies. Dabei handelt es sich um kleine Textdateien, die mit Hilfe des Browsers auf Ihrem Endgerät abgelegt werden. Sie richten keinen Schaden an. Wir nutzen Cookies dazu, unser Angebot nutzerfreundlich zu gestalten. Einige Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese löschen. Sie ermöglichen es uns, Ihren Browser beim nächsten Besuch wiederzuerkennen.

Wenn Sie dies nicht wünschen, können Sie Ihren Browser so einrichten, dass er Sie über das Setzen von Cookies informiert und Sie dies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalität unserer Website eingeschränkt sein.

Server-Log Files

Diese Webseite und der damit verbundene Provider erheben im Zuge der Webseitennutzung automatisch Informationen im Rahmen sogenannter Server-Log Files. Dies betrifft insbesondere:
- IP-Adresse oder Hostname
- den verwendeten Browser
- Aufenthaltsdauer auf der Webseite sowie Datum und Uhrzeit
- aufgerufene Seiten der Webseite
- Spracheinstellungen und Betriebssystem
- Leaving-Page
- ISP (Internet Service Provider)

Diese erhobenen Informationen werden nicht personenbezogen verarbeitet oder mit personenbezogenen Daten in Verbindung gebracht.

Der Webseitenbetreiber behält es sich vor, im Falle des Bekanntwerdens rechtswidriger Tätigkeiten diese Daten auszuwerten oder zu überprüfen.

Ihre Rechte als Betroffener

Sie haben bezüglich Ihrer bei uns gespeicherten Daten grundsätzlich ein Recht auf:
- Auskunft
- Löschung
- Berichtigung
- Übertragbarkeit
- Widerruf und Widerspruch
- Einschränkung der Verarbeitung

Wenn Sie vermuten, dass im Zuge der Verarbeitung Ihrer Daten Verstöße gegen das Datenschutzrecht passiert sind, haben Sie die Möglichkeit, sich bei uns unter mahlzeit.hungersatt@gmail.com zu melden.

Sie erreichen uns unter folgenden Kontaktdaten:
Webseitenbetreiber: Markus Gruber
E-Mail: mahlzeit.hungersatt@gmail.com
`;

  readonly agbText = `
Allgemeine Geschäftsbedingungen (AGB)

Geltungsbereich

Diese Allgemeinen Geschäftsbedingungen gelten für sämtliche Bestellungen, die über das digitale Bestellsystem des Schulbuffets durchgeführt werden. Mit der Nutzung der Webseite sowie mit der Durchführung einer Bestellung erklärt sich der Nutzer mit den nachfolgenden Bedingungen einverstanden.

Das Bestellsystem dient ausschließlich zur Vorbestellung von Mittagsgerichten im Rahmen des Schulbuffets.

Bestellung

Über das Bestellsystem können Nutzer aus dem jeweils aktuellen Menüplan Speisen auswählen und vorbestellen. Die Bestellung erfolgt über die Webseite durch Auswahl des gewünschten Gerichts und Abschluss des Bestellvorganges.

Mit Abschluss der Bestellung gibt der Nutzer ein verbindliches Angebot zum Kauf der ausgewählten Speise ab. Die Bestellung wird im System gespeichert und für den jeweiligen Ausgabetag berücksichtigt.

Bestellungen sind ausschließlich bis 11:30 Uhr des jeweiligen Tages möglich. Nach Ablauf dieser Frist können keine weiteren Bestellungen für den entsprechenden Tag durchgeführt werden.

Der Betreiber behält sich das Recht vor, Bestellungen abzulehnen oder zu stornieren, sofern technische Probleme auftreten oder die maximale Anzahl an verfügbaren Portionen erreicht ist.

Preise

Alle im System angeführten Preise sind Endpreise und enthalten sämtliche gesetzliche Abgaben.

Die jeweils gültigen Preise sind im Menüplan der Webseite ersichtlich und gelten zum Zeitpunkt der Bestellung. Preisänderungen für zukünftige Angebote bleiben vorbehalten.

Bezahlung

Die Bezahlung der bestellten Speisen erfolgt über das im System integrierte Guthabensystem.

Vor der Durchführung einer Bestellung muss ein ausreichendes Guthaben auf dem Benutzerkonto vorhanden sein. Der entsprechende Betrag wird nach Abschluss der Bestellung automatisch vom Guthaben abgezogen.

Ist kein ausreichendes Guthaben vorhanden, kann keine Bestellung durchgeführt werden.

Stornierung und Rücktritt

Da es sich bei den angebotenen Speisen um frisch zubereitete Lebensmittel handelt, die speziell auf Basis der eingegangenen Vorbestellungen vorbereitet werden, ist eine Stornierung oder Rückgabe der Bestellung grundsätzlich ausgeschlossen.

Nach Abschluss einer Bestellung besteht kein Anspruch auf Rückerstattung oder nachträgliche Änderung der Bestellung.

Ausgabe der Speisen

Die Ausgabe der bestellten Speisen erfolgt am jeweiligen Ausgabetag im Schulbuffet innerhalb der vorgesehenen Ausgabezeiten.

Der Nutzer ist selbst dafür verantwortlich, die bestellte Speise innerhalb dieses Zeitraums abzuholen.

Wird eine bestellte Speise nicht abgeholt, besteht kein Anspruch auf Rückerstattung oder Ersatzleistung.

Menüplan und Verfügbarkeit

Die angebotenen Speisen werden im Menüplan der Webseite veröffentlicht. Der Betreiber bemüht sich, die angebotenen Gerichte entsprechend bereitzustellen.

In Ausnahmefällen kann es aus organisatorischen oder lieferbedingten Gründen zu Änderungen im Menüplan kommen. Der Betreiber behält sich daher das Recht vor, angebotene Speisen kurzfristig zu ändern oder durch vergleichbare Alternativen zu ersetzen.

Allergene und Zutaten

Informationen zu enthaltenen Allergenen und Zutaten der angebotenen Speisen werden nach bestem Wissen bereitgestellt.

Trotz sorgfältiger Zubereitung kann nicht vollständig ausgeschlossen werden, dass Spuren von Allergenen enthalten sind. Personen mit Allergien oder Unverträglichkeiten werden gebeten, dies entsprechend zu berücksichtigen.

Benutzerkonto

Für die Nutzung des Bestellsystems ist ein persönliches Benutzerkonto erforderlich.

Im Rahmen der Nutzung werden unter anderem folgende Daten gespeichert:
- Name
- E-Mail-Adresse
- Klasse
- Guthabenstand
- Bestellhistorie

Der Nutzer verpflichtet sich, seine Zugangsdaten vertraulich zu behandeln und vor dem Zugriff durch Dritte zu schützen.

Haftung

Der Betreiber bemüht sich um eine möglichst störungsfreie Verfügbarkeit des Bestellsystems. Eine permanente technische Verfügbarkeit kann jedoch nicht garantiert werden.

Der Betreiber übernimmt keine Haftung für Schäden, die durch technische Störungen, Wartungsarbeiten oder andere außerhalb des Einflussbereiches liegende Ereignisse entstehen.

Ebenso wird keine Haftung für Schäden übernommen, die durch eine missbräuchliche Nutzung von Benutzerkonten entstehen.

Änderungen der AGB

Der Betreiber behält sich das Recht vor, diese Allgemeinen Geschäftsbedingungen jederzeit zu ändern oder anzupassen, sofern dies aus organisatorischen, technischen oder rechtlichen Gründen erforderlich ist.

Die jeweils aktuelle Version der AGB ist auf der Webseite abrufbar.

Schlussbestimmungen

Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.

Es gilt österreichisches Recht.

Kontakt

Bei Fragen zu diesen Allgemeinen Geschäftsbedingungen erreichen Sie uns unter folgenden Kontaktdaten:
Webseitenbetreiber: Markus Gruber
E-Mail: mahlzeit.hungersatt@gmail.com
`;

  downloadPdf(title: string, content: string, fileName: string): void {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const marginLeft = 18;
    const marginTop = 20;
    const maxWidth = 174;
    let cursorY = marginTop;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, marginLeft, cursorY);

    cursorY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(content, maxWidth);

    lines.forEach((line: string) => {
      if (cursorY > 280) {
        doc.addPage();
        cursorY = 20;
      }
      doc.text(line, marginLeft, cursorY);
      cursorY += 6;
    });

    doc.save(fileName);
  }

  downloadDatenschutz(): void {
    this.downloadPdf(
      'Datenschutzerklärung - HungerSatt Schulbistro',
      this.datenschutzText,
      'datenschutzerklaerung-hungersatt.pdf'
    );
  }

  downloadAgb(): void {
    this.downloadPdf(
      'AGB - HungerSatt Schulbistro',
      this.agbText,
      'agb-hungersatt.pdf'
    );
  }
}