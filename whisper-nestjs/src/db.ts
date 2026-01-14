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
    let effectiveSslMode = sslMode;
    let connectionStringToUse = connectionString;
    if (shouldDisableSsl) {
      try {
        const parsed = new URL(connectionString);
        parsed.searchParams.set('sslmode', 'disable');
        connectionStringToUse = parsed.toString();
        effectiveSslMode = 'disable';
      } catch {
        effectiveSslMode = sslMode;
      }
    }
    const caBase64 = optionalEnv(
      'PGSSL_CA_B64',
      process.env.PGSSL_CA_B64,
    );
    const caValue = caBase64?.trim();
    const ssl = shouldDisableSsl
      ? false
      : caValue
        ? { ca: Buffer.from(caValue, 'base64').toString('utf-8') }
        : { rejectUnauthorized: false };
    console.log(
      'db:init',
      JSON.stringify({
        host: connectionHost,
        port: connectionPort,
        database: connectionDb,
        sslMode: effectiveSslMode,
        disableSslValue,
        shouldDisableSsl,
        hasCa: Boolean(caValue),
        caLength: caValue?.length ?? 0,
      }),
    );
    pool = new Pool({ connectionString: connectionStringToUse, ssl });
  }
  return pool;
}
