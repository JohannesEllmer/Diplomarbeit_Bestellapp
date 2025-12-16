import express from 'express';
import cors from 'cors';
import { authRouter } from './auth.routes';
import { CORS_ORIGINS } from './config.js';

const app = express();

import { verifyMailer } from './mailer.js';
verifyMailer();


