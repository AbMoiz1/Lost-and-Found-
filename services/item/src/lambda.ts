import serverlessExpress from '@vendia/serverless-express';
import app from './app';
import { runMigrations } from './migrate';
import { connectMessageBroker } from './messageBroker';

let initialized = false;

const serverless = serverlessExpress({ app });

export const handler = async (event: any, context: any) => {
  if (!initialized) {
    try {
      await runMigrations();
      await connectMessageBroker();
      initialized = true;
    } catch (err) {
      console.error('Init failed:', err);
    }
  }
  return serverless(event, context);
};
