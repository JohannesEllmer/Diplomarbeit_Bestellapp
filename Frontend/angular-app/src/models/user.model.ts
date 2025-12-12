export type UserRole = 'KUNDE' | 'INHABER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  class: string;
  orderCount: number;
  balance: number;
  blocked: boolean;
  role: UserRole;
  isTeacher?: boolean;
  showDetails?: boolean;
  editingBalance?: boolean;
  editingBaseBalance?: number;
  newBalance?: number;
}
