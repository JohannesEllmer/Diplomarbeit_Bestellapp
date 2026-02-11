import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db';
import { AppSettingsRepo } from './app-settings.repo';

@Injectable()
export class AppSettingsService {
  constructor(@Inject(PG_POOL) private readonly db: Pool, private readonly repo: AppSettingsRepo) {}

  getOrderingEnabled() { return this.repo.getOrderingEnabled(this.db); }

  async setOrderingEnabled(enabled: boolean) {
    await this.db.query(
      `INSERT INTO app.app_settings (key, value, updated_at)
       VALUES ('ordering_enabled', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify(enabled)],
    );
    return { ok: true as const, orderingEnabled: enabled };
  }
}
