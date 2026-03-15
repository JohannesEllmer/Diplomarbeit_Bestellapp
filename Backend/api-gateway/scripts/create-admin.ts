import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

// Passe diese Imports an deine Pfade an:
import { AppModule } from '../src/app.module';
import { PG_POOL } from '../src/db';

//falls du deine mailer.ts im Backend hast:
import { sendMail, verifyMailer } from '../src/auth-express/src/mailer';

function buildAdminCreatedHtml(params: { email: string; password: string }) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Admin-Zugang erstellt</h2>
    <p>Für <b>${params.email}</b> wurde ein Admin-Zugang erstellt.</p>
    <p><b>Temporäres Passwort:</b> <code>${params.password}</code></p>
    <p>Bitte nach dem ersten Login sofort ändern.</p>
  </div>
  `;
}

function buildAdminUpgradedHtml(params: { email: string }) {
  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>Admin-Rechte vergeben</h2>
    <p>Für <b>${params.email}</b> wurden Admin-Rechte gesetzt.</p>
    <p>Falls noch kein Passwort existierte, wurde eines erzeugt (siehe separate Mail / Output).</p>
  </div>
  `;
}

async function main() {
  const emailRaw = process.argv[2];
  if (!emailRaw) {
    console.error('Bitte Email angeben:');
    console.error('   npm run create:admin admin@mail.com');
    process.exit(1);
  }

  const email = String(emailRaw).toLowerCase().trim();

  // Nest Application Context starten (nutzt DatabaseModule/Config wie im Backend)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  let pool: Pool | undefined;

  try {
    pool = app.get(PG_POOL) as Pool;

    // Mailer prüfen (optional: wenn nicht konfiguriert, Script läuft trotzdem)
    const mailReady = await verifyMailer().catch(() => false);

    // Prüfen ob User existiert
    const uRes = await pool.query(
      `SELECT id, email, role, name FROM app.users WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    );

    let userId: string;
    let createdPassword: string | null = null;
    let createdNewUser = false;

    if ((uRes.rowCount ?? 0) === 0) {
      // User existiert nicht -> create
      createdNewUser = true;

      createdPassword = randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(createdPassword, 10);

      const fullName = 'Admin';
      const schoolType = 'ADMIN'; // <- falls bei dir NOT NULL ist, setz sinnvollen Wert
      const userClass = '';

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const insUser = await client.query(
          `INSERT INTO app.users (name, email, class, school_type, balance, blocked, role, email_verified)
           VALUES ($1, $2, $3, $4, 0, FALSE, 'ADMIN', TRUE)
           RETURNING id`,
          [fullName, email, userClass, schoolType],
        );

        userId = String(insUser.rows[0].id);

        await client.query(
          `INSERT INTO app.auth_credentials (user_id, password_hash, auth_token)
           VALUES ($1, $2, $3)`,
          [userId, passwordHash, randomBytes(16).toString('hex')],
        );

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      console.log('Admin User erstellt');
      console.log(`Email: ${email}`);
      console.log(`User ID: ${userId}`);
      console.log(`Passwort: ${createdPassword}`);

      // Mail senden
      if (mailReady) {
        await sendMail(
          email,
          'HungerSatt – Admin Zugang erstellt',
          buildAdminCreatedHtml({ email, password: createdPassword }),
        );
        console.log('📨 Admin Mail gesendet');
      } else {
        console.warn('⚠️ Mailer nicht konfiguriert/ready – keine Mail gesendet');
      }
      return;
    }

    // User existiert -> role upgraden
    userId = String(uRes.rows[0].id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE app.users
         SET role = 'ADMIN', blocked = FALSE, email_verified = TRUE, updated_at = now()
         WHERE id = $1`,
        [userId],
      );

      // Falls keine credentials existieren -> Passwort setzen + mailen
      const credRes = await client.query(
        `SELECT 1 FROM app.auth_credentials WHERE user_id = $1 LIMIT 1`,
        [userId],
      );

      if ((credRes.rowCount ?? 0) === 0) {
        createdPassword = randomBytes(8).toString('hex');
        const passwordHash = await bcrypt.hash(createdPassword, 10);

        await client.query(
          `INSERT INTO app.auth_credentials (user_id, password_hash, auth_token)
           VALUES ($1, $2, $3)`,
          [userId, passwordHash, randomBytes(16).toString('hex')],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    console.log('Admin Rechte gesetzt');
    console.log(`Email: ${email}`);
    console.log(`User ID: ${userId}`);
    if (createdPassword) console.log(`Neues Passwort: ${createdPassword}`);

    // Mail senden
    if (mailReady) {
      if (createdPassword) {
        await sendMail(
          email,
          'HungerSatt – Admin Rechte + Passwort',
          buildAdminCreatedHtml({ email, password: createdPassword }),
        );
      } else {
        await sendMail(
          email,
          'HungerSatt – Admin Rechte vergeben',
          buildAdminUpgradedHtml({ email }),
        );
      }
      console.log('Admin Mail gesendet');
    } else {
      console.warn('Mailer nicht konfiguriert/ready – keine Mail gesendet');
    }
  } catch (err) {
    console.error('Fehler:', err);
    process.exitCode = 1;
  } finally {
    try {
      if (pool) await pool.end();
    } catch {
      // ignore
    }
    await app.close();
  }
}

main();