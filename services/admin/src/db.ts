import { Pool } from 'pg';

// Admin service database (for admin-specific data)
const adminPool = new Pool({
  connectionString: process.env.ADMIN_DATABASE_URL || 'postgresql://admin_user:admin_pass@postgres-admin:5432/admin_db',
});

// Auth service database (for user data)
const authPool = new Pool({
  connectionString: process.env.AUTH_DATABASE_URL || 'postgresql://auth_user:auth_pass@postgres-auth:5432/auth_db',
});

// Item service database (for items and claims data)
const itemPool = new Pool({
  connectionString: process.env.ITEM_DATABASE_URL || 'postgresql://item_user:item_pass@postgres-item:5432/item_db',
});

// Matching service database (for matches data)
const matchingPool = new Pool({
  connectionString: process.env.MATCHING_DATABASE_URL || 'postgresql://match_user:match_pass@postgres-matching:5432/matching_db',
});

export { adminPool as pool, authPool, itemPool, matchingPool };