import { Injectable } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
type Db = Pool | PoolClient;

@Injectable()
export class AppSettingsRepo {
  async getOrderingEnabled(db: Db): Promise<boolean> {
    const res = await db.query(
      `SELECT value FROM app.app_settings WHERE key = 'ordering_enabled' LIMIT 1`,
    );
    if (res.rowCount === 0) return true;
    const v: any = res.rows[0]?.value;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v === 'true';
    if (v && typeof v === 'object' && typeof v.enabled === 'boolean') return v.enabled;
    return true;
  }
}
