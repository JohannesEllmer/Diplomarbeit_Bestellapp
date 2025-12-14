import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import * as express from 'express';
import type { Pool } from 'pg';

import { authRouter } from './auth-express/src/auth.routes';
import { PG_POOL } from './db';                 // <- dein Symbol
import { verifySmtp } from './auth-express/src/mailer';
import { CORS_ORIGINS } from './auth-express/src/config';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (CORS_ORIGINS.length === 0) return cb(null, true);
      return cb(null, CORS_ORIGINS.includes(origin));
    },
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bestellapp API')
    .setDescription('Swagger Doku')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // ✅ HIER DER FIX:
  const pool = app.get<Pool>(PG_POOL);
  app.use('/api/auth', authRouter(pool));

  try {
    await verifySmtp();
  } catch (e) {
    console.error('[SMTP] verify failed:', e);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Gateway läuft auf http://0.0.0.0:${port}`);
}

bootstrap();
