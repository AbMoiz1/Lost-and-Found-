import { Pool } from 'pg';

// In Lambda, all pools connect to the same Aurora cluster using PGHOST/PGUSER/etc env vars.
// Locally, each pool uses a separate DATABASE_URL.

const adminPool = new Pool(
  process.env.ADMIN_DATABASE_URL
    ? { connectionString: process.env.ADMIN_DATABASE_URL }
    : undefined
);

const authPool = new Pool(
  process.env.AUTH_DATABASE_URL
    ? { connectionString: process.env.AUTH_DATABASE_URL }
    : undefined
);

const itemPool = new Pool(
  process.env.ITEM_DATABASE_URL
    ? { connectionString: process.env.ITEM_DATABASE_URL }
    : undefined
);

const matchingPool = new Pool(
  process.env.MATCHING_DATABASE_URL
    ? { connectionString: process.env.MATCHING_DATABASE_URL }
    : undefined
);

export { adminPool, authPool, itemPool, matchingPool };
