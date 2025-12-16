import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: async () => {
        const pool = new Pool({
          host: process.env.PG_HOST ?? 'localhost',
          port: Number(process.env.PG_PORT ?? 5433),
          user: process.env.PG_USER ?? 'app_user',
          password: process.env.PG_PASSWORD ?? 'supersecret',
          database: process.env.PG_DATABASE ?? 'app_db',
          max: Number(process.env.PG_POOL_MAX ?? 20),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        pool.on('connect', client => {
          client.query(`SET search_path TO app, public;`).catch(() => {});
        });

        await pool.query('SELECT 1');
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
