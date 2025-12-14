import express from 'express';
import cors from 'cors';
import { authRouter } from './auth.routes';
import { CORS_ORIGINS } from './config.js';

const app = express();

import { verifySmtp } from './mailer.js';
verifySmtp();





// --- Middleware ---
app.use(cors({
  origin: (origin, cb) => {
    console.log('[CORS] origin:', origin);

    if (!origin) return cb(null, true);

    if (CORS_ORIGINS.includes(origin)) return cb(null, true);

    // statt Error (macht im Browser oft “status 0”)
    return cb(null, false);
  },
  credentials: true,
}));


app.use(express.json());

// --- Routen ---
app.use('/auth', authRouter);

// Testroute zum Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// --- Server starten ---
const PORT = 3000;

// ✅ Wichtig: auf alle Interfaces hören, damit LAN-Geräte zugreifen können
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth-Backend läuft auf http://0.0.0.0:${PORT}`);
});
