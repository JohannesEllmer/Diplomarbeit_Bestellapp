import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';

import { AppModule } from '../../src/app.module';

export type Tokens = {
  user: string;
  admin: string;
  userId: string;
  adminId: string;
  userEmail: string;
  adminEmail: string;
};

export async function createE2EApp(): Promise<INestApplication> {
  const modRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = modRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  await app.init();
  return app;
}

function extractId(body: any): string | undefined {
  return (
    body?.id ??
    body?.user?.id ??
    body?.data?.id ??
    body?.result?.id ??
    body?.payload?.id
  );
}

async function findUserIdByEmailFallback(app: INestApplication, email: string): Promise<string> {
  // strict:false => wenn kein Provider existiert, kommt undefined statt Exception
  const pool = app.get(Pool as any, { strict: false }) as Pool | undefined;

  if (!pool) {
    throw new Error(
      [
        `Konnte User-ID nicht aus Response lesen UND kein pg Pool Provider gefunden.`,
        `=> Entweder: sorge dafür, dass POST /api/users die id zurückgibt`,
        `oder: expose deinen DB-Pool als Provider (class Pool)`,
        `oder: passe den Fallback an (TypeORM/Prisma/etc.).`,
      ].join('\n'),
    );
  }

  const q = `SELECT id FROM app.users WHERE email = $1 LIMIT 1`;
  const r = await pool.query(q, [email]);

  const id = r.rows?.[0]?.id;
  if (!id) throw new Error(`User mit email=${email} nicht gefunden (SQL-Fallback).`);
  return String(id);
}

function signAccessToken(jwt: JwtService, payload: any): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      `JWT_SECRET fehlt. Setze in test/setup-e2e.ts process.env.JWT_SECRET (oder nutze dein Config-System im Test).`,
    );
  }

  return jwt.sign(payload, { secret } as any);
}

export async function bootstrapUsersAndTokens(app: INestApplication): Promise<Tokens> {
  const http = app.getHttpServer();
  const jwt = app.get(JwtService);

  //User anlegen 
  const unique = Date.now();
  const userEmail = `user_${unique}@test.local`;
  const adminEmail = `admin_${unique}@test.local`;

  const userPassword = 'Test1234!';
  const adminPassword = 'Test1234!';

  const userCreateRes = await request(http)
    .post('/api/users')
    .send({
      email: userEmail,
      password: userPassword,
    })
    .expect((res) => {
      if (![200, 201].includes(res.status)) throw new Error(`Unexpected status ${res.status}`);
    });

  const adminCreateRes = await request(http)
    .post('/api/users')
    .send({
      email: adminEmail,
      password: adminPassword,
    })
    .expect((res) => {
      if (![200, 201].includes(res.status)) throw new Error(`Unexpected status ${res.status}`);
    });

  let userId = extractId(userCreateRes.body);
  let adminId = extractId(adminCreateRes.body);

  if (!userId) userId = await findUserIdByEmailFallback(app, userEmail);
  if (!adminId) adminId = await findUserIdByEmailFallback(app, adminEmail);

  const userPayload = {
    sub: userId,
    roles: ['user'],
  };

  const adminPayload = {
    sub: adminId,
    roles: ['admin'],
  };

  const userToken = signAccessToken(jwt, userPayload);
  const adminToken = signAccessToken(jwt, adminPayload);

  return { user: userToken, admin: adminToken, userId, adminId, userEmail, adminEmail };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

