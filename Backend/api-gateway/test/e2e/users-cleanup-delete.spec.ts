// test/e2e/users-cleanup-delete.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

import { bootstrapUsersAndTokens, createE2EApp, auth } from '../utils/e2e';
import { CleanupPolicyService } from '../../src/dsgvo-cleanup/cleanup-policy.service';

import {
  ensureCleanupSchema,
  getDbPool,
  getPendingDeletion,
  simulateBlocked3Years,
  expectUserFullyDeleted,
} from '../utils/db.e2e';

// Mailer mock (keine echten E-Mails)
jest.mock('../../src/mailer', () => ({
  sendAdminDeletionWarningMail: jest.fn(async () => true),
  sendUserDataDeletedMail: jest.fn(async () => true),
}));

describe('DSGVO Cleanup + Purge (e2e)', () => {
  let app: INestApplication;
  let http: any;

  let tokenAdmin: string;
  let adminId: string;

  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    app = await createE2EApp();
    http = app.getHttpServer();

    const t = await bootstrapUsersAndTokens(app);
    tokenAdmin = t.admin;
    adminId = t.adminId;
    userId = t.userId;
    userEmail = t.userEmail;

    const pool = getDbPool(app);
    await ensureCleanupSchema(pool);
  });

  afterAll(async () => {
    await app.close();
  });

  it('User blockieren → 3 Jahre simulieren → Cleanup erzeugt pending_deletion → Admin purged → User weg', async () => {
    const pool = getDbPool(app);

    // 1) Simuliere "3 Jahre deaktiviert"
    await simulateBlocked3Years(pool, userId);

    const uCheck = await pool.query(
      `SELECT id, email, blocked, blocked_at FROM app.users WHERE id=$1`,
      [userId],
    );
    expect(uCheck.rowCount).toBe(1);
    expect(uCheck.rows[0].blocked).toBe(true);
    expect(uCheck.rows[0].blocked_at).toBeTruthy();
    expect(String(uCheck.rows[0].email).toLowerCase()).toBe(String(userEmail).toLowerCase());

    // 2) Cleanup laufen lassen (Cron im Test simulieren)
    const cleanup = app.get(CleanupPolicyService);
    await cleanup.runCleanupPolicy();

    // 3) pending_deletions muss existieren
    const pending = await getPendingDeletion(pool, userId);
    expect(pending).toBeTruthy();
    expect(String(pending.user_id)).toBe(String(userId));
    expect(String(pending.status)).toBe('PENDING');

    // 4) Admin kann pending-deletions abrufen
    const listRes = await request(http)
      .get('/api/admin/users/pending-deletions')
      .set(auth(tokenAdmin))
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((x: any) => String(x.userId) === String(userId))).toBe(true);

    // 5) Preview Endpoint
    const prevRes = await request(http)
      .post(`/api/admin/users/${userId}/purge/preview`)
      .set(auth(tokenAdmin))
      .send({})
      .expect(200);

    expect(prevRes.body?.ok).toBe(true);
    expect(prevRes.body?.user?.id).toBeTruthy();
    expect(String(prevRes.body.user.email).toLowerCase()).toBe(String(userEmail).toLowerCase());

    // 6) Purge Confirm (confirmText muss exakt "LÖSCHEN" sein)
    const purgeRes = await request(http)
      .delete(`/api/admin/users/${userId}/purge`)
      .set(auth(tokenAdmin))
      .send({ confirmText: 'LÖSCHEN' })
      .expect(200);

    expect(purgeRes.body?.ok).toBe(true);

    // 7) DB: User + Daten weg
    await expectUserFullyDeleted(pool, userId);

    // 8) pending_deletions status CONFIRMED
    const conf = await pool.query(
      `SELECT status FROM app.pending_deletions WHERE user_id=$1 LIMIT 1`,
      [userId],
    );
    expect(conf.rowCount).toBeGreaterThanOrEqual(1);
    expect(conf.rows[0].status).toBe('CONFIRMED');
  });

  it('Cleanup soll NICHT doppelt pending_deletion anlegen', async () => {
    const pool = getDbPool(app);

    // Neuen user erzeugen (über deinen create Endpoint)
    const unique = Date.now();
    const res = await request(http)
      .post('/api/users')
      .send({ email: `dup_${unique}@test.local`, password: 'Test1234!' })
      .expect((r) => {
        if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
      });

    const id =
      res.body?.id ?? res.body?.user?.id ?? res.body?.data?.id;

    expect(id).toBeTruthy();

    await simulateBlocked3Years(pool, String(id));

    const cleanup = app.get(CleanupPolicyService);
    await cleanup.runCleanupPolicy();
    await cleanup.runCleanupPolicy();

    const rows = await pool.query(
      `SELECT * FROM app.pending_deletions WHERE user_id=$1 AND status='PENDING'`,
      [String(id)],
    );

    expect(rows.rowCount).toBe(1);
  });

  it('Cleanup soll KEINE pending_deletion anlegen wenn blocked_at < 3 Jahre', async () => {
    const pool = getDbPool(app);

    const unique = Date.now();
    const res = await request(http)
      .post('/api/users')
      .send({ email: `young_${unique}@test.local`, password: 'Test1234!' })
      .expect((r) => {
        if (![200, 201].includes(r.status)) throw new Error(`Unexpected ${r.status}`);
      });

    const id =
      res.body?.id ?? res.body?.user?.id ?? res.body?.data?.id;
    expect(id).toBeTruthy();

    // blocked, aber nur 1 Tag
    await pool.query(
      `UPDATE app.users SET blocked=TRUE, blocked_at = NOW() - interval '1 day' WHERE id=$1`,
      [String(id)],
    );

    const cleanup = app.get(CleanupPolicyService);
    await cleanup.runCleanupPolicy();

    const rows = await pool.query(
      `SELECT * FROM app.pending_deletions WHERE user_id=$1`,
      [String(id)],
    );

    expect(rows.rowCount).toBe(0);
  });
});