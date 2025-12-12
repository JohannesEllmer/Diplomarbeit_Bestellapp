// src/auth.routes.ts
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from './config.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/* -------------------------------------------------------
   Helper: JWT erzeugen
-------------------------------------------------------- */
function createJwt(payload: { userId: string; email: string; role: string; sessionId: string }) {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      sid: payload.sessionId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* -------------------------------------------------------
   GET /auth/check-email
-------------------------------------------------------- */
router.get('/check-email', async (req, res) => {
  const email = ((req.query.email as string) || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });

  const result = await pool.query(
    'SELECT 1 FROM app.users WHERE LOWER(email) = $1 LIMIT 1',
    [email]
  );

  // Fix: rowCount ?? 0
  const exists = (result.rowCount ?? 0) > 0;

  res.json({ exists });
});

/* -------------------------------------------------------
   POST /auth/register
-------------------------------------------------------- */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, class: userClass, schoolType } = req.body;

    if (!email || !password || !firstName || !lastName || !userClass) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const emailLower = email.toLowerCase();

    // Check if email already exists
    const exists = await pool.query(
      'SELECT 1 FROM app.users WHERE LOWER(email) = $1 LIMIT 1',
      [emailLower]
    );

    // Fix: rowCount ?? 0
    if ((exists.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: 'ACCOUNT_EXISTS' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fullName = `${firstName} ${lastName}`;

      // 1️⃣ User anlegen
      const userResult = await client.query(
  `INSERT INTO app.users (name, email, class, school_type, balance, blocked, role)
   VALUES ($1, $2, $3, $4, 0, FALSE, 'KUNDE')
   RETURNING id, name, email, class, school_type, balance, blocked, role, created_at, updated_at`,
  [fullName, emailLower, userClass, schoolType]
);



      const user = userResult.rows[0];

      // 2️⃣ Passwort hashen + Session Token erzeugen
      const passwordHash = await bcrypt.hash(password, 10);
      const sessionId = uuidv4();

      await client.query(
        `INSERT INTO app.auth_credentials (user_id, password_hash, auth_token)
         VALUES ($1, $2, $3)`,
        [user.id, passwordHash, sessionId]
      );

      await client.query('COMMIT');

      // JWT erzeugen
      const token = createJwt({
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId,
      });

      res.status(201).json({ token, user });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      res.status(500).json({ error: 'REGISTER_FAILED' });
    } finally {
      client.release();
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* -------------------------------------------------------
   POST /auth/login
-------------------------------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = (email || '').toLowerCase();

    if (!emailLower || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    // User + Credentials holen
    const result = await pool.query(
      `SELECT
         u.id, u.name, u.email, u.class, u.balance, u.blocked, u.role, u.created_at, u.updated_at,
         a.password_hash, a.auth_token
       FROM app.users u
       JOIN app.auth_credentials a ON a.user_id = u.id
       WHERE LOWER(u.email) = $1`,
      [emailLower]
    );

    // Fix: rowCount ?? 0
    if ((result.rowCount ?? 0) === 0) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    const row = result.rows[0];

    if (row.blocked) {
      return res.status(403).json({ error: 'USER_BLOCKED' });
    }

    // Passwort prüfen
    const isValidPw = await bcrypt.compare(password, row.password_hash);
    if (!isValidPw) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
    }

    // Neue Session erzeugen
    const newSessionId = uuidv4();

    await pool.query(
      `UPDATE app.auth_credentials
       SET auth_token = $1, last_used_at = now()
       WHERE user_id = $2`,
      [newSessionId, row.id]
    );

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      class: row.class,
      balance: row.balance,
      blocked: row.blocked,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const token = createJwt({
      userId: row.id,
      email: row.email,
      role: row.role,
      sessionId: newSessionId,
    });

    res.json({ token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

/* -------------------------------------------------------
   EXPORT ROUTER
-------------------------------------------------------- */
export default router;
