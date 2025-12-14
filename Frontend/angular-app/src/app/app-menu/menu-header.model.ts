export interface MenuHeader {
  id: string;
  name: string;
  email: string;
  role: 'KUNDE' | 'INHABER' | 'ADMIN' | string;
  balance: number;
  orderCount: number;
  blocked: boolean;
  class?: string;
}

export const EMPTY_MENU_HEADER: MenuHeader = {
  id: '',
  name: '',
  email: '',
  role: '',
  balance: 0,
  orderCount: 0,
  blocked: false,
};
