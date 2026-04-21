import { pool } from './db';

export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create admin database schema
    // Note: The admin service will primarily read from other service databases
    // but may need its own tables for admin-specific data like audit logs
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    console.log('Admin service migrations completed');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}