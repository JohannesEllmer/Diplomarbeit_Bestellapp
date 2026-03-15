export type PendingDeletionDto = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  class: string | null;
  disabledSince: string;     // ISO
  plannedDeletionAt: string; // ISO
};