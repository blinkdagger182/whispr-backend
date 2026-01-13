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
    const disableSslValue = (disableSsl ?? '').trim().toLowerCase();
    let sslMode: string | null = null;
    let connectionHost: string | null = null;
    let connectionPort: string | null = null;
    let connectionDb: string | null = null;
    try {
      const parsed = new URL(connectionString);
      sslMode = parsed.searchParams.get('sslmode');
      connectionHost = parsed.hostname;
      connectionPort = parsed.port || null;
      connectionDb = parsed.pathname?.replace('/', '') || null;
    } catch {
      sslMode = null;
    }
    const shouldDisableSsl =
      disableSslValue === 'true' ||
      disableSslValue === '1' ||
      disableSslValue === 'yes' ||
      (sslMode !== null && sslMode.toLowerCase() === 'disable');
    const ssl = shouldDisableSsl ? false : { rejectUnauthorized: false };
    console.log(
      'db:init',
      JSON.stringify({
        host: connectionHost,
        port: connectionPort,
        database: connectionDb,
        sslMode,
        disableSslValue,
        shouldDisableSsl,
      }),
    );
    pool = new Pool({ connectionString, ssl });
  }
  return pool;
}
