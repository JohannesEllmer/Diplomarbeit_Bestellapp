import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { Pool } from 'pg';

import { JWT_SECRET, JWT_EXPIRES_IN, APP_BASE_URL } from './config.js';
import { sendMail } from './mailer.js';
import { createRandomToken, hashToken } from './tokenHelper.js';
import { requireAuth } from './auth.middleware.js';

declare global {
  namespace Express {
    interface Request {
      auth?: { sub: string; email: string; role: string; sid: string };
    }
  }
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createJwt(payload: { userId: string; email: string; role: string; sessionId: string }) {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      sid: payload.sessionId
    },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

function buildVerifyEmailHtml(params: { firstName: string; lastName: string; link: string }) {
  const firstName = escapeHtml(params.firstName);
  const lastName = escapeHtml(params.lastName);
  const link = escapeHtml(params.link);

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <p>Hallo ${firstName} ${lastName},</p>

    <p>
      bitte bestätige deine E-Mail-Adresse, um dein <b>HungerSatt</b>-Konto zu aktivieren.
    </p>

    <p style="margin: 16px 0;">
      <a
        href="${link}"
        style="display:inline-block; padding:10px 14px; border-radius:6px; text-decoration:none; background:#2563eb; color:#ffffff;"
      >
        E-Mail bestätigen
      </a>
    </p>

    <p style="font-size: 13px; color: #374151;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br/>
      <a href="${link}">${link}</a>
    </p>

    <p style="font-size: 13px; color: #666;">
      Wenn du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
    </p>
  </div>
  `;
}

function buildResetPasswordHtml(params: { name: string; link: string }) {
  const name = escapeHtml(params.name);
  const link = escapeHtml(params.link);

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <p>Hallo ${name},</p>

    <p>
      du hast ein Zurücksetzen deines Passworts angefordert. Über den folgenden Link kannst du ein neues Passwort setzen.
    </p>

    <p style="margin: 16px 0;">
      <a
        href="${link}"
        style="display:inline-block; padding:10px 14px; border-radius:6px; text-decoration:none; background:#2563eb; color:#ffffff;"
      >
        Passwort zurücksetzen
      </a>
    </p>

    <p style="font-size: 13px; color: #374151;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br/>
      <a href="${link}">${link}</a>
    </p>

    <p style="font-size: 13px; color: #666;">
      Der Link ist 30 Minuten gültig. Wenn du das nicht warst, ignoriere bitte diese E-Mail.
    </p>
  </div>
  `;
}

export function authRouter(pool: Pool) {
  const router = express.Router();

  router.get('/check-email', async (req, res) => {
    try {
      const email = ((req.query.email as string) || '').toLowerCase().trim();
      if (!email) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED' });
      }

      const user = await pool.query(
        `SELECT 1 FROM app.users WHERE LOWER(email) = $1 LIMIT 1`,
        [email]
      );

      if ((user.rowCount ?? 0) > 0) {
        return res.json({ exists: true });
      }

      const pending = await pool.query(
        `SELECT 1
         FROM app.pending_registrations
         WHERE LOWER(email) = $1
           AND used_at IS NULL
           AND expires_at > now()
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

      const existsUser = await pool.query(
        `SELECT 1 FROM app.users WHERE LOWER(email) = $1 LIMIT 1`,
        [emailLower]
      );

      if ((existsUser.rowCount ?? 0) > 0) {
        return res.status(409).json({ error: 'ACCOUNT_EXISTS' });
      }

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

      let emailVerificationSent = false;

      try {
        await sendMail(
          emailLower,
          'HungerSatt – E-Mail-Adresse bestätigen',
          buildVerifyEmailHtml({
            firstName: payload.firstName,
            lastName: payload.lastName,
            link: verifyLink,
          }),
        );
        emailVerificationSent = true;
      } catch (mailErr: any) {
        console.error('REGISTER_MAIL_FAILED:', mailErr?.message ?? mailErr);
      }

      return res.status(200).json({ ok: true, emailVerificationSent });
    } catch (err: any) {
      console.error('REGISTER_FAILED:', {
        message: err?.message,
        code: err?.code,
        detail: err?.detail,
      });
      return res.status(500).json({ error: 'REGISTER_FAILED' });
    }
  });

  router.post('/forgot-password', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').toLowerCase().trim();
      if (!email) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED' });
      }

      const userRes = await pool.query(
        `SELECT id, email, name FROM app.users WHERE LOWER(email) = $1 LIMIT 1`,
        [email],
      );

      if ((userRes.rowCount ?? 0) === 0) {
        return res.json({ ok: true });
      }

      const user = userRes.rows[0];
      const resetToken = createRandomToken();
      const tokenHash = hashToken(resetToken);

      await pool.query(
        `INSERT INTO app.auth_tokens (user_id, token_type, token_hash, expires_at)
         VALUES ($1, 'PASSWORD_RESET', $2, now() + interval '30 minutes')`,
        [user.id, tokenHash],
      );

      const link = `${APP_BASE_URL}/reset-password?token=${resetToken}`;

      try {
        await sendMail(
          email,
          'HungerSatt – Passwort zurücksetzen',
          buildResetPasswordHtml({ name: user.name ?? '', link }),
        );
      } catch (mailErr: any) {
        console.error('FORGOT_PASSWORD_MAIL_FAILED:', mailErr?.message ?? mailErr);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error('FORGOT_PASSWORD_FAILED:', err?.message ?? err);
      return res.status(500).json({ error: 'FORGOT_PASSWORD_FAILED' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const token = String(req.body?.token ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '');

    if (!token) {
      return res.status(400).json({ error: 'TOKEN_REQUIRED' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'WEAK_PASSWORD' });
    }

    const tokenHash = hashToken(token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tok = await client.query(
        `SELECT id, user_id
         FROM app.auth_tokens
         WHERE token_type = 'PASSWORD_RESET'
           AND token_hash = $1
           AND used_at IS NULL
           AND expires_at > now()
         LIMIT 1`,
        [tokenHash],
      );

      if ((tok.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
      }

      const row = tok.rows[0];
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await client.query(
        `UPDATE app.auth_credentials
         SET password_hash = $1, last_used_at = now()
         WHERE user_id = $2`,
        [passwordHash, row.user_id],
      );

      await client.query(
        `UPDATE app.auth_tokens SET used_at = now() WHERE id = $1`,
        [row.id]
      );

      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('RESET_PASSWORD_FAILED:', err?.message ?? err);
      return res.status(500).json({ error: 'RESET_PASSWORD_FAILED' });
    } finally {
      client.release();
    }
  });

  router.post('/change-password', requireAuth, async (req, res) => {
    try {
      const userId = req.auth!.sub;
      const currentPassword = String(req.body?.currentPassword ?? '');
      const newPassword = String(req.body?.newPassword ?? '');

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'WEAK_PASSWORD' });
      }

      const cred = await pool.query(
        `SELECT password_hash FROM app.auth_credentials WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if ((cred.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' });
      }

      const ok = await bcrypt.compare(currentPassword, cred.rows[0].password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'INVALID_CURRENT_PASSWORD' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await pool.query(
        `UPDATE app.auth_credentials
         SET password_hash = $1, last_used_at = now()
         WHERE user_id = $2`,
        [passwordHash, userId],
      );

      return res.json({ ok: true });
    } catch (err: any) {
      console.error('CHANGE_PASSWORD_FAILED:', err?.message ?? err);
      return res.status(500).json({ error: 'CHANGE_PASSWORD_FAILED' });
    }
  });

  router.post('/verify-email', async (req, res) => {
    const { token } = req.body as { token?: string };

    if (!token) {
      return res.status(400).json({ error: 'TOKEN_REQUIRED' });
    }

    const tokenHash = hashToken(token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const pr = await client.query(
        `SELECT id, email, payload, password_hash
         FROM app.pending_registrations
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > now()
         LIMIT 1`,
        [tokenHash],
      );

      if ((pr.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
      }

      const row = pr.rows[0];
      const payload = row.payload as any;

      const already = await client.query(
        `SELECT 1 FROM app.users WHERE LOWER(email) = $1 LIMIT 1`,
        [String(row.email).toLowerCase()],
      );

      if ((already.rowCount ?? 0) > 0) {
        await client.query(
          `UPDATE app.pending_registrations SET used_at = now() WHERE id = $1`,
          [row.id]
        );
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

      await client.query(
        `UPDATE app.pending_registrations SET used_at = now() WHERE id = $1`,
        [row.id]
      );

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

      if (!emailLower || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const result = await pool.query(
        `SELECT
           u.id, u.name, u.email, u.class, u.school_type, u.balance, u.blocked, u.role, u.email_verified, u.created_at, u.updated_at,
           a.password_hash, a.auth_token
         FROM app.users u
         JOIN app.auth_credentials a ON a.user_id = u.id
         WHERE LOWER(u.email) = $1`,
        [emailLower],
      );

      if ((result.rowCount ?? 0) === 0) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      }

      const row = result.rows[0];

      if (row.blocked) {
        return res.status(403).json({ error: 'USER_BLOCKED' });
      }

      if (!row.email_verified) {
        return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
      }

      const ok = await bcrypt.compare(String(password), row.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      }

      const newSessionId = uuidv4();

      await pool.query(
        `UPDATE app.auth_credentials
         SET auth_token = $1, last_used_at = now()
         WHERE user_id = $2`,
        [newSessionId, row.id],
      );

      const tokenJwt = createJwt({
        userId: row.id,
        email: row.email,
        role: row.role,
        sessionId: newSessionId
      });

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