function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v.trim();
}

function optional(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const JWT_SECRET = required('JWT_SECRET');
export const JWT_EXPIRES_IN = optional('JWT_EXPIRES_IN', '2h');

export const APP_BASE_URL = required('APP_BASE_URL');

/**
 * CORS:
 * - "*"  → alle Origins erlaubt
 */
export const CORS_ORIGINS_RAW = optional('CORS_ORIGINS', '*');
export const CORS_ORIGINS =
  CORS_ORIGINS_RAW === '*'
    ? '*'
    : CORS_ORIGINS_RAW.split(',').map(s => s.trim()).filter(Boolean);

/**
 * Gmail / Google API
 */
export const GMAIL_SENDER = required('GMAIL_SENDER');
export const GOOGLE_CLIENT_ID = required('GOOGLE_CLIENT_ID');
export const GOOGLE_CLIENT_SECRET = required('GOOGLE_CLIENT_SECRET');
export const GOOGLE_REFRESH_TOKEN = required('GOOGLE_REFRESH_TOKEN');
