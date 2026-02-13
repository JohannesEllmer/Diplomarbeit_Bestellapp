import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { config } from './config';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: async () => {
        const pool = new Pool({
          host: config.pg.host,
          port: config.pg.port,
          user: config.pg.user,
          password: config.pg.password,
          database: config.pg.database,
          max: config.pg.poolMax,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: config.pg.ssl ? { rejectUnauthorized: false } : undefined,
        });

        pool.on('connect', client => {
          client.query(`SET search_path TO app, public;`).catch(() => {});
        });

        //Fail fast, wenn DB nicht erreichbar
        await pool.query('SELECT 1');
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
