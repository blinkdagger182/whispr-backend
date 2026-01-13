import { Pool } from 'pg';
import { requireEnv } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = requireEnv(
      'DATABASE_URL',
      process.env.DATABASE_URL,
    );
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}
