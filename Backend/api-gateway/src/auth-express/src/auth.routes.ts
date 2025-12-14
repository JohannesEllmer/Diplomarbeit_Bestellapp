import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';

import { JWT_SECRET, JWT_EXPIRES_IN, APP_BASE_URL } from './config.js';
import { sendMail } from './mailer.js';
import { createRandomToken, hashToken } from './tokenHelper.js';
// import { requireAuth } from './auth.middleware.js'; // optional

function createJwt(payload: { userId: string; email: string; role: string; sessionId: string }) {
  return jwt.sign(
    { sub: payload.userId, email: payload.email, role: payload.role, sid: payload.sessionId },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

// ✅ WIEDER: authRouter exportiert – aber als Factory
export function authRouter(pool: Pool) {
  const router = express.Router();

  router.get('/check-email', async (req, res) => {
  console.log('[AUTH] check-email HIT');
  return res.json({ ok: true });
});


  router.get('/check-email', async (req, res) => {
    try {
      const email = ((req.query.email as string) || '').toLowerCase().trim();
      if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });

      const user = await pool.query(`SELECT 1 FROM app.users WHERE LOWER(email)=$1 LIMIT 1`, [email]);
      if ((user.rowCount ?? 0) > 0) return res.json({ exists: true });

      const pending = await pool.query(
        `SELECT 1 FROM app.pending_registrations
         WHERE LOWER(email)=$1 AND used_at IS NULL AND expires_at > now()
         LIMIT 1`,
        [email],
      );

      return res.json({ exists: (pending.rowCount ?? 0) > 0 });
    } catch (err: any) {
      console.error('CHECK-EMAIL FAILED:', err?.message ?? err);
      return res.status(500).json({ error: 'CHECK_EMAIL_FAILED' });
    }
  });

  router.post('/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, class: userClass, schoolType, isTeacher } = req.body;

      if (!email || !password || !firstName || !lastName || !schoolType) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'WEAK_PASSWORD' });
      }

      const emailLower = String(email).toLowerCase().trim();

      const existsUser = await pool.query(`SELECT 1 FROM app.users WHERE LOWER(email)=$1 LIMIT 1`, [emailLower]);
      if ((existsUser.rowCount ?? 0) > 0) return res.status(409).json({ error: 'ACCOUNT_EXISTS' });

      const payload = {
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        class: (userClass ?? '').toString().trim(),
        schoolType,
        isTeacher: Boolean(isTeacher),
      };

      const passwordHash = await bcrypt.hash(String(password), 10);

      const verifyToken = createRandomToken();
      const tokenHash = hashToken(verifyToken);

      await pool.query(
        `INSERT INTO app.pending_registrations (email, payload, password_hash, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '24 hours')
         ON CONFLICT (email) DO UPDATE
           SET payload = EXCLUDED.payload,
               password_hash = EXCLUDED.password_hash,
               token_hash = EXCLUDED.token_hash,
               expires_at = EXCLUDED.expires_at,
               used_at = NULL`,
        [emailLower, payload, passwordHash, tokenHash],
      );

      const verifyLink = `${APP_BASE_URL}/verify-email?token=${verifyToken}`;
      console.log('[AUTH] sending verify mail to', emailLower);

      await sendMail(
        emailLower,
        'Bitte bestätige deine E-Mail',
        `<div><p>Hi ${payload.firstName} ${payload.lastName}</p><p><a href="${verifyLink}">E-Mail bestätigen</a></p></div>`,
      );

      return res.status(200).json({ ok: true, emailVerificationSent: true });
    } catch (err: any) {
      console.error('REGISTER_FAILED:', err?.message ?? err);
      return res.status(500).json({ error: 'REGISTER_FAILED' });
    }
  });

  router.post('/verify-email', async (req, res) => {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'TOKEN_REQUIRED' });

    const tokenHash = hashToken(token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pr = await client.query(
        `SELECT id, email, payload, password_hash
         FROM app.pending_registrations
         WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()
         LIMIT 1`,
        [tokenHash],
      );

      if ((pr.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
      }

      const row = pr.rows[0];
      const payload = row.payload as any;

      const already = await client.query(`SELECT 1 FROM app.users WHERE LOWER(email)=$1 LIMIT 1`, [
        String(row.email).toLowerCase(),
      ]);

      if ((already.rowCount ?? 0) > 0) {
        await client.query(`UPDATE app.pending_registrations SET used_at=now() WHERE id=$1`, [row.id]);
        await client.query('COMMIT');
        return res.json({ ok: true });
      }

      const fullName = `${payload.firstName} ${payload.lastName}`;
      const sessionId = uuidv4();

      const userResult = await client.query(
        `INSERT INTO app.users (name, email, class, school_type, balance, blocked, role, email_verified)
         VALUES ($1, $2, $3, $4, 0, FALSE, 'KUNDE', TRUE)
         RETURNING id, name, email, class, school_type, balance, blocked, role, email_verified, created_at, updated_at`,
        [fullName, row.email, payload.class ?? '', payload.schoolType],
      );

      await client.query(
        `INSERT INTO app.auth_credentials (user_id, password_hash, auth_token)
         VALUES ($1, $2, $3)`,
        [userResult.rows[0].id, row.password_hash, sessionId],
      );

      await client.query(`UPDATE app.pending_registrations SET used_at=now() WHERE id=$1`, [row.id]);
      await client.query('COMMIT');

      return res.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      return res.status(500).json({ error: 'SERVER_ERROR' });
    } finally {
      client.release();
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const emailLower = String(email || '').toLowerCase().trim();
      if (!emailLower || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });

      const result = await pool.query(
        `SELECT
           u.id, u.name, u.email, u.class, u.school_type, u.balance, u.blocked, u.role, u.email_verified, u.created_at, u.updated_at,
           a.password_hash, a.auth_token
         FROM app.users u
         JOIN app.auth_credentials a ON a.user_id = u.id
         WHERE LOWER(u.email) = $1`,
        [emailLower],
      );

      if ((result.rowCount ?? 0) === 0) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

      const row = result.rows[0];
      if (row.blocked) return res.status(403).json({ error: 'USER_BLOCKED' });
      if (!row.email_verified) return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });

      const ok = await bcrypt.compare(String(password), row.password_hash);
      if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

      const newSessionId = uuidv4();
      await pool.query(`UPDATE app.auth_credentials SET auth_token=$1, last_used_at=now() WHERE user_id=$2`, [
        newSessionId,
        row.id,
      ]);

      const tokenJwt = createJwt({ userId: row.id, email: row.email, role: row.role, sessionId: newSessionId });

      const user = {
        id: row.id,
        name: row.name,
        email: row.email,
        class: row.class,
        school_type: row.school_type,
        balance: row.balance,
        blocked: row.blocked,
        role: row.role,
        email_verified: row.email_verified,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      return res.json({ token: tokenJwt, user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'SERVER_ERROR' });
    }
  });

  return router;
}
