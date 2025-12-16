import { google } from 'googleapis';
import {
  GMAIL_SENDER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN
} from './config.js';

function encodeBase64Url(str: string) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildRawEmail(params: { to: string; subject: string; html: string }) {
  const from = `HungerSatt <${GMAIL_SENDER}>`;
  const headers = [
    `From: ${from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Auto-Submitted: auto-generated`,
    `X-Auto-Response-Suppress: All`,
  ];

  const message = `${headers.join('\r\n')}\r\n\r\n${params.html}`;
  return encodeBase64Url(message);
}

function getOAuth() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;

  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  oauth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return oauth2;
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
    console.error('Gmail API verify failed:', e?.message ?? e);
    return false;
  }
}

export async function sendMail(to: string, subject: string, html: string) {
  const oauth = getOAuth();
  if (!oauth) throw new Error('GMAIL_API_NOT_CONFIGURED');

  const gmail = google.gmail({ version: 'v1', auth: oauth });

  const raw = buildRawEmail({ to, subject, html });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log('📧 Mail gesendet (Gmail API):', res.data?.id);
  return res.data;
}
