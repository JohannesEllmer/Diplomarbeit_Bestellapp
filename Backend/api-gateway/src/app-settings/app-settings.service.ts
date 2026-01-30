import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';

@Injectable()
export class AppSettingsService {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  async getOrderingEnabled(): Promise<boolean> {
    const res = await this.db.query(
      `SELECT value FROM app.app_settings WHERE key = 'ordering_enabled' LIMIT 1`,
    );
    if (res.rowCount === 0) return true;
    const v = res.rows[0]?.value;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true';
    if (v && typeof v === 'object') {
      // falls mal { enabled: true } gespeichert wurde
      if (typeof v.enabled === 'boolean') return v.enabled;
    }
    return true;
  }

  async setOrderingEnabled(enabled: boolean): Promise<{ ok: true; orderingEnabled: boolean }> {
    await this.db.query(
      `INSERT INTO app.app_settings (key, value, updated_at)
       VALUES ('ordering_enabled', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(enabled)],
    );

    return { ok: true, orderingEnabled: enabled };
  }
}
