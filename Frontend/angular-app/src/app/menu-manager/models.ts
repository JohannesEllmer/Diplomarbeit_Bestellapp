export interface Dish {
  name: string;
  description?: string;
  price?: number;
}

export interface Menu {
  title: string;
  dish: Dish[];
}

export const MENUS: Menu[] = [
  { title: 'Menu1', dish: [] },
  { title: 'Menu2', dish: [] },
  { title: 'Menu3', dish: [] },
  { title: 'Menu4', dish: [] },
  { title: 'Menu5', dish: [] },
  { title: 'Menu6', dish: [] },
  { title: 'Menu7', dish: [] },
  { title: 'Menu8', dish: [] },
  { title: 'Menu9', dish: [] },
  { title: 'Menu10', dish: [] },
  { title: 'Menu11', dish: [] },
  { title: 'Menu12', dish: [] },
  { title: 'Menu13', dish: [] },
  { title: 'Menu14', dish: [] }
];
