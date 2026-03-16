export const LOGIN_TTL_DAYS = 400;

export function isLoginExpired(lastLoginAt: Date | null | undefined): boolean {
  if (!lastLoginAt) return false;

  const ms = Date.now() - new Date(lastLoginAt).getTime();
  const days = ms / (1000 * 60 * 60 * 24);

  return days > LOGIN_TTL_DAYS;
}