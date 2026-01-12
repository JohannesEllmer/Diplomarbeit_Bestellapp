export const JWT_SECRET = process.env.JWT_SECRET ?? 'supersecretjwtkey';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';

export const APP_BASE_URL =
  process.env.APP_BASE_URL ?? 'http://10.10.0.174:4200';

export const CORS_ORIGINS =
  (process.env.CORS_ORIGINS ?? 'http://10.10.0.174:4200,http://localhost:4200')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

export const GMAIL_SENDER = process.env.GMAIL_SENDER ?? 'hungersatt123@gmail.com';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '546392092664-sfffevp491mr2uaoq6t2u169idin7h82.apps.googleusercontent.com';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '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';
export const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? '1//036kJoNOf11gZCgYIARAAGAMSNwF-L9Ir8bt8RSCS45C3NjtSMkWLCNKfZVndX4Mbgc3WLKUb5Noig-LE4rYQ9hTm2naWTkQHyvg';
