import serverlessExpress from '@vendia/serverless-express';
import app from './app';
import { runMigrations } from './migrate';

let migrated = false;

const serverless = serverlessExpress({ app });

export const handler = async (event: any, context: any) => {
  if (!migrated) {
    try {
      await runMigrations();
      migrated = true;
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }
  return serverless(event, context);
};
