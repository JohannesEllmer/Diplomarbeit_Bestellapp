export type NotificationTargetKind = 'OWNER' | 'USER';

export type NotificationType =
  | 'ORDER_SUCCESS'
  | 'ORDER_INCOMING'
  | 'PICKUP_1H'
  | 'PICKUP_NOW'
  | 'CREDIT_CHANGED'
  | 'ORDER_COMPLETED';

export interface DbNotification {
  id: string;
  target_kind: NotificationTargetKind;
  target_user_id: string | null;

  type: NotificationType;
  title: string;
  message: string;

  link: string | null;
  data: any;

  created_at: string;
  scheduled_at: string | null;

  delivered_at: string | null;
  read_at: string | null;
}
