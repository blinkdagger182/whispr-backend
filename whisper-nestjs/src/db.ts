import { Pool } from 'pg';
import { optionalEnv, requireEnv } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = requireEnv(
      'DATABASE_URL',
      process.env.DATABASE_URL,
    );
    const disableSsl = optionalEnv(
      'PGSSL_DISABLE',
      process.env.PGSSL_DISABLE,
    );
    const ssl =
      disableSsl === 'true' ? false : { rejectUnauthorized: false };
    pool = new Pool({ connectionString, ssl });
  }
  return pool;
}
