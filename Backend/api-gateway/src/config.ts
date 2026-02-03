function must(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be a number`);
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v ? String(v).trim() : fallback;
}

function csv(name: string): string[] {
  const v = process.env[name];
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export const config = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: num('PORT', 3000),

  appBaseUrl: must('APP_BASE_URL'),

  cors: {
    // "*" => alle Origins erlauben (Browser: per Origin-Reflection)
    origins: str('CORS_ORIGINS', '*') === '*' ? '*' : csv('CORS_ORIGINS'),
    credentials: bool('CORS_CREDENTIALS', false), // optional, default false
  },

  jwt: {
    secret: must('JWT_SECRET'),
    expiresIn: str('JWT_EXPIRES_IN', '2h'),
  },

  pg: {
    host: str('PG_HOST', 'localhost'),
    port: num('PG_PORT', 5432),
    user: str('PG_USER', 'app_user'),
    password: str('PG_PASSWORD', ''),
    database: str('PG_DATABASE', 'app_db'),
    poolMax: num('PG_POOL_MAX', 20),
    ssl: bool('PG_SSL', false),
  },

  gmail: {
    sender: str('GMAIL_SENDER', ''),
    clientId: str('GOOGLE_CLIENT_ID', ''),
    clientSecret: str('GOOGLE_CLIENT_SECRET', ''),
    refreshToken: str('GOOGLE_REFRESH_TOKEN', ''),
  },
};
