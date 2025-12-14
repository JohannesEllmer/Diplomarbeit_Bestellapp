// src/mailer.ts
import nodemailer from 'nodemailer';
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} from './config.js';

export const mailer = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // STARTTLS bei 587
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// 🔍 Beim Start prüfen
export async function verifySmtp() {
  try {
    await mailer.verify();
    console.log('✅ Gmail SMTP bereit');
  } catch (err: any) {
    console.error('❌ Gmail SMTP Fehler:', err?.message ?? err);
  }
}

// 📧 Mail senden
export async function sendMail(
  to: string,
  subject: string,
  html: string
) {
  const info = await mailer.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,

    // No-Reply-Gefühl
    replyTo: 'no-reply@gmail.com',
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    },
  });

  console.log('📧 Mail gesendet:', info.messageId);
}
