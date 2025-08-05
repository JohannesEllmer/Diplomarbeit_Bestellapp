export interface User {
  id: number;
  name: string;
  email: string;
  class: string;
  orderCount: number;
  balance: number;
  blocked: boolean;
  profileImageUrl?: string;
  showDetails?: boolean;
  editingBalance?: boolean;
  newBalance?: number;
}
