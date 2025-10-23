export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  vegetarian: boolean;
  allergens: string[];
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
  id: number;
  user: User;
  items: OrderItem[];
  totalPrice: number;
  createdAt: Date;
  status: "open" | "closed";
  showDetails?: boolean;
  qrCodeUrl?: string; 
}

export interface User {
  id: number;
  name: string;
  email: string;
  class: string;
  orderCount: number;
  balance: number;
  blocked: boolean;
  showDetails?: boolean;
  editingBalance?: boolean;
  newBalance?: number;
}


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
