export const CLASS_TTL_DAYS = 400;

export function isClassExpired(classUpdatedAt: Date | null | undefined): boolean {
  if (!classUpdatedAt) return true; // wenn nie gesetzt -> muss gesetzt werden
  const ms = Date.now() - new Date(classUpdatedAt).getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return days > CLASS_TTL_DAYS;
}
