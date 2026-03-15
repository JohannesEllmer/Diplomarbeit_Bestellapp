import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Pool } from 'pg';
import { PG_POOL } from '../db';
import { sendAdminDeletionWarningMail } from '../auth-express/src/mailer';

@Injectable()
export class CleanupPolicyService {
  private readonly logger = new Logger(CleanupPolicyService.name);

  constructor(@Inject(PG_POOL) private readonly db: Pool) {}

  // läuft jeden Tag um 06:10
  @Cron('10 6 * * *')
  async runCleanupPolicy() {
    try {
      const res = await this.db.query(
        `
        SELECT id, name, email, "class", blocked_at
        FROM app.users
        WHERE blocked = TRUE
        AND blocked_at IS NOT NULL
        AND blocked_at <= (NOW() - interval '3 years')
        `
      );

      const users = res.rows ?? [];

      for (const u of users) {
        const plannedDeletion = new Date();
        plannedDeletion.setDate(plannedDeletion.getDate() + 14);

        const check = await this.db.query(
          `
          SELECT 1 FROM app.pending_deletions
          WHERE user_id = $1 AND status = 'PENDING'
          `,
          [u.id]
        );

        if ((check.rowCount ?? 0) > 0) continue;

        await this.db.query(
          `
          INSERT INTO app.pending_deletions
          (
            user_id,
            user_name,
            user_email,
            user_class,
            blocked_since,
            planned_deletion_at,
            status,
            admin_notified_at,
            created_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,'PENDING',NOW(),NOW())
          `,
          [
            u.id,
            u.name,
            u.email,
            u.class ?? null,
            u.blocked_at,
            plannedDeletion
          ]
        );

        try {
          await sendAdminDeletionWarningMail({
            name: u.name ?? '',
            email: u.email,
            class: u.class ?? '',
            plannedDeletionAtIso: plannedDeletion.toISOString(),
          });
        } catch (e) {
          this.logger.warn('Admin Mail konnte nicht gesendet werden');
        }
      }

      this.logger.log(`Cleanup geprüft: ${users.length} Kandidaten`);
    } catch (err) {
      this.logger.error('Cleanup Fehler', err);
    }
  }
}