import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db';

export type DbAudience = 'USER' | 'OWNER';

export type InsertNotification = {
  userId: string | null;     // ✅ OWNER darf NULL sein
  audience: DbAudience;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  data?: any;
};

@Injectable()
export class NotificationsRepo {
  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  // ✅ User: letzte Notifications (cursor optional)
  async listLatest(userId: string, beforeId: string | null, limit = 20) {
    const lim = Math.max(1, Math.min(200, Number(limit || 20)));

    if (!beforeId) {
      const res = await this.db.query(
        `SELECT id, user_id, audience, type, title, message, link, data, is_read, created_at
         FROM app.notifications
         WHERE audience = 'USER' AND user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, lim],
      );
      return res.rows;
    }

    // ✅ beforeId ist garantiert UUID (Service!), daher safe
    const res = await this.db.query(
      `SELECT id, user_id, audience, type, title, message, link, data, is_read, created_at
       FROM app.notifications
       WHERE audience = 'USER'
         AND user_id = $1
         AND created_at < (SELECT created_at FROM app.notifications WHERE id = $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, beforeId, lim],
    );
    return res.rows;
  }

  // ✅ mark read (nur User, der Besitzer)
  async markRead(userId: string, notificationId: string) {
    const res = await this.db.query(
      `UPDATE app.notifications
       SET is_read = true
       WHERE id = $1 AND audience = 'USER' AND user_id = $2
       RETURNING id`,
      [notificationId, userId],
    );
    return { ok: (res.rowCount ?? 0) > 0 };
  }

  // ✅ clear all (nur User)
  async clearAll(userId: string) {
    await this.db.query(
      `UPDATE app.notifications
       SET is_read = true
       WHERE audience = 'USER' AND user_id = $1`,
      [userId],
    );
    return { ok: true };
  }

  // ✅ Owner: alle Notifications von heute
  async listOwnerToday(limit = 200) {
    const lim = Math.max(1, Math.min(500, Number(limit || 200)));

    const res = await this.db.query(
      `SELECT id, user_id, audience, type, title, message, link, data, is_read, created_at
       FROM app.notifications
       WHERE audience = 'OWNER'
         AND created_at >= date_trunc('day', now())
       ORDER BY created_at DESC
       LIMIT $1`,
      [lim],
    );

    return res.rows;
  }

  // ✅ Insert (USER oder OWNER)
  async insert(n: InsertNotification) {
    const res = await this.db.query(
      `INSERT INTO app.notifications (user_id, audience, type, title, message, link, data, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, false, now())
       RETURNING id`,
      [
        n.userId,                // ✅ kann NULL sein
        n.audience,              // 'USER' | 'OWNER'
        n.type,
        n.title,
        n.message,
        n.link ?? null,
        JSON.stringify(n.data ?? {}),
      ],
    );

    return { ok: true, id: String(res.rows[0].id) };
  }
}
