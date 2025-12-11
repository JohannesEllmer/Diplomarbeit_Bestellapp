// src/index.ts
import express from 'express';
import cors from 'cors';
import authRouter from './auth.routes.js';

const app = express();

// --- Middleware ---
app.use(cors({
  origin: 'http://localhost:4200', // dein Angular-Frontend
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
app.listen(PORT, () => {
  console.log(`Auth-Backend läuft auf http://localhost:${PORT}`);
});
