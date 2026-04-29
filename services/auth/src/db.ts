import { Pool } from 'pg';

// Uses DATABASE_URL if set (local Docker), otherwise falls back to
// PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE env vars (Lambda/Aurora)
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : undefined
);

export default pool;
