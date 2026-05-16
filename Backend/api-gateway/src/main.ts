import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Pool } from 'pg';

import { authRouter } from './auth-express/src/auth.routes';
import { PG_POOL } from './db';
import { verifyMailer } from './auth-express/src/mailer';
import { UsersService } from './users/users.service';
import { ClassPolicyGuard } from './profile-update.guard';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (config.cors.origins === '*') {
    app.enableCors({
      origin: true,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    const allowed = new Set(config.cors.origins);
    app.enableCors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl/postman
        cb(null, allowed.has(origin));
      },
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api');

  app.useGlobalGuards(new ClassPolicyGuard(app.get(UsersService)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

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

  const pool = app.get<Pool>(PG_POOL);
  app.use('/api/auth', authRouter(pool));

    app.getHttpAdapter().get('/health-checks', (req, res) => {
    res.status(200).send('OK');
  });

  try {
    await verifyMailer();
  } catch (e) {
    console.error('[MAILER] verify failed:', e);
  }

  await app.listen(config.port, '0.0.0.0');
  console.log(`Gateway läuft auf http://0.0.0.0:${config.port}`);
}

bootstrap();
