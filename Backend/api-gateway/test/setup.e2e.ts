// test/setup-e2e.ts
import { beforeAll, afterAll } from '@jest/globals';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __E2E_PG__: PostgreSqlContainer | undefined;
  // eslint-disable-next-line no-var
  var __E2E_DB_URL__: string | undefined;
}

beforeAll(async () => {
  const pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('app_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  globalThis.__E2E_PG__ = pg as any;
  globalThis.__E2E_DB_URL__ = pg.getConnectionUri();

  process.env.DATABASE_URL = globalThis.__E2E_DB_URL__!;
  process.env.NODE_ENV = 'test';

  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-secret';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
}, 120000);

afterAll(async () => {
  if (globalThis.__E2E_PG__) {
    await (globalThis.__E2E_PG__ as any).stop();
  }
});