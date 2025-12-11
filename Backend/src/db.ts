// db.ts
import { Pool } from 'pg';

export const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'app_user',
  password: 'supersecret',
  database: 'app_db',
});
