export type NotificationType =
  | 'ORDER_SUCCESS'
  | 'ORDER_INCOMING'
  | 'PICKUP_1H'
  | 'PICKUP_NOW'
  | 'CREDIT_CHANGED'
  | 'ORDER_COMPLETED';

export interface AppNotification {
  id: string;
  type: NotificationType | string;

  title: string;
  message: string;

  link?: string | null;
  data?: any;

  createdAt?: string; // ISO vom Backend
  read?: boolean;     // lokal markiert
  ttlMs?: number;     // toast duration in milliseconds (for template animation)
}
