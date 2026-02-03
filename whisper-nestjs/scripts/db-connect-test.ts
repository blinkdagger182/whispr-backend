import { getPool } from '../src/db';

async function main() {
  const pool = getPool();
  const result = await pool.query('select 1 as ok');
  console.log('db:test', result.rows[0]);
  await pool.end();
}

main().catch((error) => {
  console.error('db:test:error', error);
  process.exit(1);
});
