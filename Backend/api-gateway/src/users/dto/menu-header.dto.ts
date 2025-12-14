export class MenuHeaderDto {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INHABER' | 'KUNDE';
  balance: number;
  blocked: boolean;
  class?: string;
  orderCount?: number;
}
