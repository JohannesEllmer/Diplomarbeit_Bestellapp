export interface DailyStats {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
  customers: number;
  ordersList: Order[];
}

export interface StatisticsResponse {
  days: DailyStats[];
  totals: {
    totalOrders: number;
    totalCustomers: number;
    totalRevenue: number;
  };
  previousPeriod?: {
    totalOrders: number;
    totalCustomers: number;
    totalRevenue: number;
  };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];

  drink?: string;
  dessert?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  class: string;
  orderCount: number;
  balance: number;
  blocked: boolean;

  // UI optional
  showDetails?: boolean;
  editingBalance?: boolean;
  newBalance?: number;
}


export interface OrderItem {
  menuItem: MenuItem;
  user: User;
  note: string;
  quantity: number;
  delivered?: boolean;
  deliveryTime?: string;
}

export interface Order {
  id: string;
  user: User;
  items: OrderItem[];
  totalPrice: number;
  createdAt: any;
  status: 'open' | 'closed';
  qrCodeUrl?: string;

  // UI helper
  showDetails?: boolean;
}

