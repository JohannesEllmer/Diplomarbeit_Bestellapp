import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem, User, Order } from '../../models/menu-item.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-overview',
  templateUrl: './order-overview.html',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./order-overview.css']
})
export class OrderOverviewComponent {
  showImpressumPopup = false;
  user1: User = {
    id: 1,
    name: "Max Mustermann",
    email: "max@test.at",
    class: "3A",
    orderCount: 2,
    balance: 30,
    blocked: false
  };

  user2: User = {
    id: 2,
    name: "Anna Schmidt",
    email: "anna@test.at",
    class: "4B",
    orderCount: 1,
    balance: 15,
    blocked: false
  };

  menuItems: MenuItem[] = [
    { id: 1, name: "Käse-Semmel", description: "Frisches Weckerl mit Käse", price: 2.5, category: "Brot", available: true, vegetarian: true, allergens: ["Gluten", "Milch"] },
    { id: 2, name: "Schinken-Käse-Toast", description: "Knuspriger Toast mit Schinken & Käse", price: 3.0, category: "Snack", available: true, vegetarian: false, allergens: ["Gluten", "Milch"] },
    { id: 3, name: "Mineralwasser", description: "0,5l still oder prickelnd", price: 1.2, category: "Getränke", available: true, vegetarian: true, allergens: [] }
  ];

  orders: Order[] = [
    {
      id: 1,
      user: this.user1,
      items: [
        { menuItem: this.menuItems[0], quantity: 2, note: "ohne Butter", delivered: false, user: this.user1 },
        { menuItem: this.menuItems[2], quantity: 1, note: "", delivered: false, user: this.user1 }
      ],
      totalPrice: 0,
      createdAt: new Date(),
      status: "open"
    },
    {
      id: 2,
      user: this.user2,
      items: [
        { menuItem: this.menuItems[1], quantity: 1, note: "extra Käse", delivered: false, user: this.user2 }
      ],
      totalPrice: 0,
      createdAt: new Date(new Date().getTime() - 1000 * 60 * 60),
      status: "closed"
    }
  ];

  constructor(private router: Router) {   // ✅ Router hier injizieren!
    this.orders.forEach(order => {
      order.totalPrice = order.items.reduce(
        (sum, item) => sum + item.menuItem.price * item.quantity,
        0
      );

      // QR-Code nur für offene Bestellungen generieren
      if (order.status === 'open') {
        order.qrCodeUrl = this.generateQrCode(order.id);
      }
    });
  }

  toggleDetails(order: Order) {
    order.showDetails = !order.showDetails;
  }

  generateQrCode(orderId: number): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Order-${orderId}`;
  }

  get openOrders(): Order[] {
    return this.orders.filter(o => o.status === 'open');
  }

  get closedOrders(): Order[] {
    return this.orders.filter(o => o.status === 'closed');
  }

  navigateBack(): void {
    this.router.navigate(['/']); // ✅ funktioniert jetzt korrekt
  }

  loadOrders(): void {
    // Hier würden Sie normalerweise die Bestellungen vom Server laden.
    // Für dieses Beispiel aktualisieren wir einfach die Liste der Bestellungen.
    console.log('Bestellungen wurden aktualisiert.');
    // Beispiel: Neue Bestellung hinzufügen (in einer echten App würden Sie die Daten vom Server holen)
  }
}