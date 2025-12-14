export class User {
  id: string;
  name: string;
  email: string;
  class: string;
  role: 'ADMIN' | 'INHABER' | 'KUNDE';
  orderCount: number;
  balance: number;
  blocked: boolean;
}
