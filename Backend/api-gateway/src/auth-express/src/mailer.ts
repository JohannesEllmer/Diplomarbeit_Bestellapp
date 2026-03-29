import { google } from 'googleapis';
import {
  GMAIL_SENDER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN
} from './config.js';

function encodeBase64Url(input: string | Buffer) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodeMimeWord(text: string) {
  // RFC 2047 für Betreff mit Umlauten/Sonderzeichen
  const base64 = Buffer.from(text, 'utf8').toString('base64');
  return `=?UTF-8?B?${base64}?=`;
}

function escapeHeaderValue(value: string) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function buildRawEmail(params: { to: string; subject: string; html: string }) {
  const fromName = 'HungerSatt';
  const fromAddress = escapeHeaderValue(GMAIL_SENDER);
  const to = escapeHeaderValue(params.to);
  const subject = encodeMimeWord(params.subject);

  const from = `${encodeMimeWord(fromName)} <${fromAddress}>`;

  // HTML separat Base64-kodieren, damit Sonderzeichen sicher transportiert werden
  const htmlBase64 = Buffer.from(params.html, 'utf8').toString('base64');

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];

  const message = `${headers.join('\r\n')}\r\n\r\n${htmlBase64}`;
  return encodeBase64Url(message);
}

function getOAuth() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  const oauth2 = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

function explainOAuthError(e: any) {
  return (
    `GMAIL OAuth Fehler: ${e?.message ?? e}\n` +
    `Typisch bei "invalid_grant": Refresh-Token widerrufen/abgelaufen oder falsche Client-ID/Secret/Scopes.\n` +
    `Fix: Refresh-Token neu erzeugen und in .env setzen.`
  );
}

export async function verifyMailer() {
  const oauth = getOAuth();
  if (!oauth) {
    console.error('Gmail API nicht konfiguriert: GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN fehlen');
    return false;
  }

  try {
    await oauth.getAccessToken();
    console.log('Gmail API bereit');
    return true;
  } catch (e: any) {
    console.error(explainOAuthError(e));
    return false;
  }
}

export async function sendMail(to: string, subject: string, html: string) {
  const oauth = getOAuth();
  if (!oauth) {
    throw new Error('GMAIL_API_NOT_CONFIGURED');
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth });
    const raw = buildRawEmail({ to, subject, html });

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log('Mail gesendet (Gmail API):', res.data?.id);
    return res.data;
  } catch (e: any) {
    console.error(explainOAuthError(e));
    throw e;
  }
}

export async function sendAdminDeletionWarningMail(params: {
  name: string;
  email: string;
  class: string;
  plannedDeletionAtIso: string;
}) {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h2>DSGVO-Löschung angekündigt</h2>

    <p>Ein deaktivierter Nutzer steht zur Löschung an.</p>

    <ul>
      <li><b>Name:</b> ${params.name}</li>
      <li><b>E-Mail:</b> ${params.email}</li>
      <li><b>Klasse:</b> ${params.class}</li>
    </ul>

    <p>
      Geplante Löschung: <b>${params.plannedDeletionAtIso}</b>
    </p>

    <p>
      Bitte im Adminbereich prüfen und bestätigen.
    </p>
  </div>
  `;

  return sendMail(
    GMAIL_SENDER,
    'HungerSatt – Nutzerlöschung angekündigt',
    html
  );
}

export async function sendUserDataDeletedMail(
  email: string,
  name: string
) {
  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <p>Hallo ${name},</p>

    <p>
      dein Konto wurde gemäß Datenschutzrichtlinien gelöscht.
    </p>

    <p>
      Alle personenbezogenen Daten wurden vollständig entfernt.
    </p>

    <p>
      Falls du den Dienst erneut nutzen möchtest,
      musst du dich neu registrieren.
    </p>

    <p>
      Freundliche Grüße<br>
      HungerSatt
    </p>
  </div>
  `;

  return sendMail(
    email,
    'HungerSatt – Konto gelöscht',
    html
  );
}