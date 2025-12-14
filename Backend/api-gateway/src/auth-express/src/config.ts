// JWT
export const JWT_SECRET = process.env.JWT_SECRET ?? 'supersecretjwtkey';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';

// Frontend-URL (für Verify- & Reset-Links)
export const APP_BASE_URL =
  process.env.APP_BASE_URL ?? 'http://192.168.0.25:4200';

// CORS
export const CORS_ORIGINS =
  (process.env.CORS_ORIGINS ?? 'http://192.168.0.25:4200,http://localhost:4200')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

// =====================
// GMAIL SMTP
// =====================
export const SMTP_HOST = 'smtp.gmail.com';
export const SMTP_PORT = 587; // STARTTLS

export const SMTP_USER = 'hungersatt123@gmail.com';

// ⚠️ HIER DAS APP-PASSWORT EINFÜGEN
export const SMTP_PASS = 'tebudxapfjrjgola';

export const SMTP_FROM =
  'HungerSatt hungersatt123@gmail.com';
