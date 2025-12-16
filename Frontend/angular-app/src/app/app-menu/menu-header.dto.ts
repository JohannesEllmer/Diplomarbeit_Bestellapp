import { UserRole } from '../../models/user.model';

export interface MenuHeaderDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  balance: number;
  blocked: boolean;
  class?: string;
  orderCount?: number;
}
